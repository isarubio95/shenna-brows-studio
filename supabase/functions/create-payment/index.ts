import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Buffer } from "node:buffer";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { applyRateLimit, getClientIp, rateLimitHeaders } from "../_shared/rateLimit.ts";
import { sha256Hex, verifyTurnstileToken } from "../_shared/security.ts";
import {
  createMerchantSignature,
  encodeMerchantParameters,
  formatAmount12,
  redsysRealizarPagoUrl,
  type RedsysMerchantParams,
} from "../_shared/redsys.ts";
import { normalizeProvinceCode, shippingEurForShippingAddress } from "../_shared/shipping.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-visitor-id, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

type CheckoutProductRow = {
  id: string;
  name: string;
  price: unknown;
  stock: number | null;
  color_variants: unknown;
};

type ParsedColorVariant = { id: string; name: string; hex: string };

function normalizeHexStrict(raw: string): string | null {
  let s = (raw || "").trim();
  if (!s) return null;
  if (!s.startsWith("#")) s = `#${s}`;
  const m = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.exec(s);
  if (!m) return null;
  const body = m[1];
  if (body.length === 3) {
    const [a, b, c] = body.split("");
    return `#${a}${a}${b}${b}${c}${c}`.toUpperCase();
  }
  return `#${body.toUpperCase()}`;
}

function parseColorVariantsFromDb(raw: unknown): ParsedColorVariant[] {
  if (!raw || !Array.isArray(raw)) return [];
  const out: ParsedColorVariant[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const o = item as Record<string, unknown>;
    const id = String(o.id ?? "").trim();
    const name = String(o.name ?? "").trim();
    const hex = normalizeHexStrict(String(o.hex ?? ""));
    if (!id || !name || !hex) continue;
    out.push({ id, name, hex });
  }
  return out;
}

function getRedsysEnv(): "test" | "production" {
  const v = (Deno.env.get("REDSYS_ENV") || "test").toLowerCase();
  return v === "production" || v === "prod" ? "production" : "test";
}

function generateMerchantOrder(): string {
  const digits: number[] = [];
  digits.push(1 + Math.floor(Math.random() * 9));
  for (let i = 1; i < 12; i++) digits.push(Math.floor(Math.random() * 10));
  return digits.join("");
}

function minorUnitsFromEur(eur: number): number {
  return Math.round(eur * 100);
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const ip = getClientIp(req);
    const visitorId = req.headers.get("x-visitor-id")?.trim() || "anonymous";
    const authHeader = req.headers.get("authorization");
    const userKey = authHeader?.startsWith("Bearer ") ? await sha256Hex(authHeader.slice(7)) : null;

    const ipLimit = await applyRateLimit({
      endpoint: "create-payment",
      kind: "ip",
      key: ip,
      limit: 5,
      window: "1 m",
    });
    if (!ipLimit.success) {
      console.warn("rate_limit_block", { endpoint: "create-payment", scope: "ip", retryAfter: ipLimit.retryAfterSec });
      return new Response(JSON.stringify({ error: "Too many requests" }), {
        status: 429,
        headers: { ...corsHeaders, "Content-Type": "application/json", ...rateLimitHeaders(ipLimit) },
      });
    }

    const identityLimit = await applyRateLimit({
      endpoint: "create-payment",
      kind: "identity",
      key: userKey ?? visitorId,
      limit: userKey ? 30 : 20,
      window: "1 m",
    });
    if (!identityLimit.success) {
      console.warn("rate_limit_block", {
        endpoint: "create-payment",
        scope: "identity",
        retryAfter: identityLimit.retryAfterSec,
      });
      return new Response(JSON.stringify({ error: "Too many requests" }), {
        status: 429,
        headers: { ...corsHeaders, "Content-Type": "application/json", ...rateLimitHeaders(identityLimit) },
      });
    }

    const merchantCode = Deno.env.get("REDSYS_MERCHANT_CODE")?.trim();
    const terminal = Deno.env.get("REDSYS_TERMINAL")?.trim() || "001";
    const secretKey = Deno.env.get("REDSYS_SECRET_KEY")?.trim();
    const currency = Deno.env.get("REDSYS_CURRENCY")?.trim() || "978";
    const supabaseUrl = Deno.env.get("SUPABASE_URL")?.trim();
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")?.trim();

    if (!merchantCode || !secretKey || !supabaseUrl || !serviceKey) {
      console.error("create_payment_misconfigured");
      return new Response(JSON.stringify({ error: "Pago no configurado en el servidor" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const terminalPadded = terminal.length >= 3 ? terminal : terminal.padStart(3, "0");

    const { items, customerEmail, turnstileToken, shippingAddress } = await req.json() as {
      items?: Array<{ productId: string; quantity: number; colorVariantId?: string }>;
      customerEmail?: string;
      turnstileToken?: string;
      shippingAddress?: Record<string, unknown>;
    };

    const turnstileValid = await verifyTurnstileToken(String(turnstileToken || ""), ip);
    if (!turnstileValid) {
      console.warn("checkout_blocked_turnstile", { endpoint: "create-payment", ip });
      return new Response(JSON.stringify({ error: "Bot challenge failed" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return new Response(JSON.stringify({ error: "No items provided" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const email = String(customerEmail || "").trim().toLowerCase();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return new Response(JSON.stringify({ error: "Email inválido" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(supabaseUrl, serviceKey);
    const productIds = [...new Set(items.map((i) => String(i.productId)))];
    const { data: products, error: productsError } = await admin
      .from("products")
      .select("id, name, price, stock, color_variants")
      .in("id", productIds);

    if (productsError || !products?.length) {
      console.error("create_payment_products", productsError);
      return new Response(JSON.stringify({ error: "No se pudieron cargar los productos" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const productRows = products as CheckoutProductRow[];
    const byId = new Map(productRows.map((p) => [String(p.id), p]));
    let subtotalEur = 0;
    const resolvedLines: Array<{
      productId: string;
      name: string;
      quantity: number;
      unitPrice: number;
    }> = [];

    for (const line of items) {
      const pid = String(line.productId);
      const qty = Math.floor(Number(line.quantity));
      const p = byId.get(pid) as CheckoutProductRow | undefined;
      if (!p || qty < 1) {
        return new Response(JSON.stringify({ error: "Línea de carrito inválida" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (p.stock != null && qty > Number(p.stock)) {
        return new Response(JSON.stringify({ error: `Stock insuficiente: ${p.name}` }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const unit = Number(p.price);
      subtotalEur += unit * qty;

      const colorVariants = parseColorVariantsFromDb(p.color_variants);
      const variantIdRaw = line.colorVariantId != null ? String(line.colorVariantId).trim() : "";
      let displayName = String(p.name);
      if (colorVariants.length > 0) {
        if (!variantIdRaw) {
          return new Response(
            JSON.stringify({ error: `Debes elegir un color para: ${p.name}` }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
          );
        }
        const chosen = colorVariants.find((v) => v.id === variantIdRaw);
        if (!chosen) {
          return new Response(JSON.stringify({ error: "Color de producto no válido" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        displayName = `${String(p.name)} — ${chosen.name}`;
      }

      resolvedLines.push({ productId: pid, name: displayName, quantity: qty, unitPrice: unit });
    }

    const trim = (v: unknown, max: number) => String(v ?? "").trim().slice(0, max);
    const sa = shippingAddress && typeof shippingAddress === "object" ? shippingAddress : {};
    const shipName = trim(sa.name, 120);
    const shipLine1 = trim(sa.line1 ?? sa.address, 200);
    const shipLine2 = trim(sa.line2, 120);
    const shipCp = trim(sa.postal_code ?? sa.cp ?? sa.zip, 12);
    const shipCity = trim(sa.city ?? sa.locality, 120);
    const shipProvinceLabel = trim(sa.province ?? sa.state, 80);
    const shipPhone = trim(sa.phone ?? sa.phoneNumber, 32);
    const provinceCodeNorm = normalizeProvinceCode(sa.province_code ?? sa.provinceCode);
    const shipCountryRaw = trim(sa.country, 8).toUpperCase();
    const shipCountry = provinceCodeNorm === "PT"
      ? (shipCountryRaw === "ESP" || shipCountryRaw === "" ? "PRT" : shipCountryRaw)
      : (shipCountryRaw || "ESP");

    const missingShip: string[] = [];
    if (!shipName) missingShip.push("name");
    if (!shipLine1) missingShip.push("line1");
    if (!shipCp) missingShip.push("postal_code");
    if (!shipCity) missingShip.push("city");
    if (!provinceCodeNorm) missingShip.push("province_code");
    if (!shipPhone) missingShip.push("phone");
    if (missingShip.length > 0) {
      return new Response(
        JSON.stringify({ error: `Faltan datos de envío: ${missingShip.join(", ")}` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const shippingEur = shippingEurForShippingAddress(provinceCodeNorm, shipCity);
    if (shippingEur == null) {
      return new Response(JSON.stringify({ error: "Código de provincia de envío no válido" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const totalEur = subtotalEur + shippingEur;

    const provinceDisplay = shipProvinceLabel || provinceCodeNorm;

    const normalizedShipping = {
      name: shipName,
      line1: shipLine1,
      line2: shipLine2,
      postal_code: shipCp,
      city: shipCity,
      province: provinceDisplay,
      province_code: provinceCodeNorm,
      phone: shipPhone,
      country: shipCountry,
    };
    const amountMinor = minorUnitsFromEur(totalEur);
    if (amountMinor < 1) {
      return new Response(JSON.stringify({ error: "Importe inválido" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const origin = (req.headers.get("origin") || Deno.env.get("SITE_URL") || "http://localhost:8080").replace(/\/$/, "");
    const notifyUrl = `${supabaseUrl.replace(/\/$/, "")}/functions/v1/redsys-notify`;

    const merchantOrder = generateMerchantOrder();

    const pendingCartSnapshot = {
      lines: resolvedLines.map((l) => ({
        productId: l.productId,
        quantity: l.quantity,
        name: l.name,
        productDisplayName: l.name,
        unitPrice: l.unitPrice,
      })),
    };

    const { error: pendingOrderErr } = await admin.from("orders").insert({
      email,
      status: "pending_payment",
      subtotal: subtotalEur,
      shipping: shippingEur,
      total: totalEur,
      stripe_session_id: merchantOrder,
      shipping_address: normalizedShipping,
      pending_cart_snapshot: pendingCartSnapshot,
    });
    if (pendingOrderErr) {
      console.warn("create_payment_pending_order_insert", pendingOrderErr);
    }

    const merchantDataPayload = {
      email,
      lines: resolvedLines.map((l) => ({
        productId: l.productId,
        quantity: l.quantity,
        productDisplayName: l.name,
      })),
      shippingEur,
      subtotalEur,
      shippingAddress: normalizedShipping,
    };
    const merchantDataB64 = Buffer.from(JSON.stringify(merchantDataPayload), "utf8").toString("base64");

    const merchantParams: RedsysMerchantParams = {
      Ds_Merchant_Amount: formatAmount12(amountMinor),
      Ds_Merchant_Order: merchantOrder,
      Ds_Merchant_MerchantCode: merchantCode,
      Ds_Merchant_Currency: currency,
      Ds_Merchant_TransactionType: "0",
      Ds_Merchant_Terminal: terminalPadded,
      Ds_Merchant_MerchantURL: notifyUrl,
      Ds_Merchant_UrlOK: `${origin}/payment-success`,
      Ds_Merchant_UrlKO: `${origin}/payment-ko`,
      Ds_Merchant_ConsumerLanguage: "001",
      Ds_Merchant_MerchantData: merchantDataB64,
      Ds_Merchant_ProductDescription: "Shenna Brows Studio",
    };

    const dsMerchantParameters = encodeMerchantParameters(merchantParams);
    const dsSignature = createMerchantSignature(secretKey, merchantOrder, dsMerchantParameters);

    return new Response(
      JSON.stringify({
        redsysUrl: redsysRealizarPagoUrl(getRedsysEnv()),
        Ds_SignatureVersion: "HMAC_SHA256_V1",
        Ds_MerchantParameters: dsMerchantParameters,
        Ds_Signature: dsSignature,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("Payment error:", msg);
    return new Response(JSON.stringify({ error: msg }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});

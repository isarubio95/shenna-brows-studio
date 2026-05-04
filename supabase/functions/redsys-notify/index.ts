import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Buffer } from "node:buffer";
import { decodeMerchantParameters, isMerchantSignatureValid } from "../_shared/redsys.ts";

const secretKey = Deno.env.get("REDSYS_SECRET_KEY")?.trim();
const supabaseUrl = Deno.env.get("SUPABASE_URL")?.trim();
const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")?.trim();

type MerchantShippingAddress = {
  name?: string;
  line1?: string;
  line2?: string;
  postal_code?: string;
  city?: string;
  province?: string;
  phone?: string;
  country?: string;
};

type MerchantPayload = {
  email: string;
  lines: Array<{ productId: string; quantity: number }>;
  shippingEur: number;
  subtotalEur: number;
  shippingAddress?: MerchantShippingAddress;
  shipping_address?: MerchantShippingAddress;
};

function normalizeBase64(s: string): string {
  let t = s.trim().replace(/-/g, "+").replace(/_/g, "/");
  const rem = t.length % 4;
  if (rem !== 0) t += "=".repeat(4 - rem);
  return t;
}

function parseMerchantPayloadJson(json: string): MerchantPayload | null {
  try {
    const raw = JSON.parse(json) as Record<string, unknown>;
    const email = raw.email ?? raw.Email;
    const linesRaw = raw.lines ?? raw.Lines;
    const lines = Array.isArray(linesRaw)
      ? linesRaw.filter((x): x is { productId?: string; quantity?: number } => x != null && typeof x === "object")
      : [];
    const normalizedLines = lines
      .map((x) => ({
        productId: String(x.productId ?? (x as Record<string, unknown>).product_id ?? ""),
        quantity: Math.floor(Number(x.quantity) || 0),
      }))
      .filter((x) => x.productId && x.quantity > 0);
    if (typeof email !== "string" || !email.trim() || !normalizedLines.length) return null;
    return {
      email: String(email).trim().toLowerCase(),
      lines: normalizedLines,
      shippingEur: Number(raw.shippingEur ?? 0),
      subtotalEur: Number(raw.subtotalEur ?? 0),
      shippingAddress: (raw.shippingAddress ?? raw.shipping_address) as MerchantShippingAddress | undefined,
      shipping_address: (raw.shipping_address ?? raw.shippingAddress) as MerchantShippingAddress | undefined,
    };
  } catch {
    return null;
  }
}

function decodeMerchantDataB64(b64: string): MerchantPayload | null {
  const attempts = [b64.trim(), normalizeBase64(b64)];
  for (const candidate of attempts) {
    if (!candidate) continue;
    try {
      const json = Buffer.from(candidate, "base64").toString("utf8");
      const parsed = parseMerchantPayloadJson(json);
      if (parsed?.email && parsed.lines?.length) return parsed;
    } catch {
      /* siguiente intento */
    }
  }
  return null;
}

type PendingOrderRow = {
  email?: string | null;
  subtotal?: unknown;
  shipping?: unknown;
  shipping_address?: unknown;
  pending_cart_snapshot?: unknown;
};

function payloadFromPendingRow(row: PendingOrderRow): MerchantPayload | null {
  const snap = row.pending_cart_snapshot as { lines?: Array<{ productId?: unknown; quantity?: unknown }> } | null;
  const rawLines = snap?.lines;
  const email = row.email != null ? String(row.email).trim().toLowerCase() : "";
  if (!email || !Array.isArray(rawLines) || !rawLines.length) return null;
  const lines = rawLines
    .map((l) => ({
      productId: String(l?.productId ?? ""),
      quantity: Math.floor(Number(l?.quantity) || 0),
    }))
    .filter((l) => l.productId && l.quantity > 0);
  if (!lines.length) return null;
  return {
    email,
    lines,
    subtotalEur: Number(row.subtotal ?? 0),
    shippingEur: Number(row.shipping ?? 0),
    shipping_address: row.shipping_address as MerchantShippingAddress | undefined,
  };
}

function extractMerchantDataB64(decoded: Record<string, unknown>): string {
  const directKeys = [
    "Ds_MerchantData",
    "DS_MERCHANTDATA",
    "Ds_Merchant_MerchantData",
    "DS_MERCHANT_MERCHANTDATA",
    "ds_merchantdata",
    "ds_merchant_merchantdata",
  ];
  for (const k of directKeys) {
    const v = decoded[k];
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  for (const [k, v] of Object.entries(decoded)) {
    if (typeof v !== "string" || !v.trim()) continue;
    const lower = k.toLowerCase();
    if (lower.includes("merchantdata") && lower.includes("merchant")) return v.trim();
    if (lower === "ds_merchantdata") return v.trim();
  }
  return "";
}

function shippingAddressFromPayload(a: MerchantShippingAddress | undefined): Record<string, string> | null {
  if (!a || typeof a !== "object") return null;
  const name = pick(a as Record<string, unknown>, ["name"]);
  const line1 = pick(a as Record<string, unknown>, ["line1", "address"]);
  const postal_code = pick(a as Record<string, unknown>, ["postal_code", "cp", "zip"]);
  const city = pick(a as Record<string, unknown>, ["city", "locality"]);
  const province = pick(a as Record<string, unknown>, ["province", "state"]);
  const phone = pick(a as Record<string, unknown>, ["phone", "phoneNumber"]);
  if (!name || !line1 || !postal_code || !city || !province || !phone) return null;
  const line2 = pick(a as Record<string, unknown>, ["line2"]);
  const country = pick(a as Record<string, unknown>, ["country"]) || "ESP";
  return { name, line1, line2, postal_code, city, province, phone, country };
}

function pick(obj: Record<string, unknown>, keys: string[]): string {
  for (const k of keys) {
    const v = obj[k];
    if (v != null && String(v) !== "") return String(v);
  }
  return "";
}

serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 });
  }

  if (!secretKey || !supabaseUrl || !serviceKey) {
    console.error("redsys_notify_misconfigured");
    return new Response("Misconfigured", { status: 500 });
  }

  try {
    const form = await req.formData();
    const dsMerchantParameters = String(form.get("Ds_MerchantParameters") ?? form.get("Ds_MERCHANTPARAMETERS") ?? "");
    const dsSignature = String(form.get("Ds_Signature") ?? form.get("Ds_SIGNATURE") ?? "");

    if (!dsMerchantParameters || !dsSignature) {
      console.warn("redsys_notify_missing_fields");
      return new Response("Bad Request", { status: 400 });
    }

    if (!isMerchantSignatureValid(dsSignature, secretKey, dsMerchantParameters)) {
      console.warn("redsys_notify_bad_signature");
      return new Response("Invalid signature", { status: 400 });
    }

    const decoded = decodeMerchantParameters<Record<string, unknown>>(dsMerchantParameters);
    const dsResponse = pick(decoded, ["Ds_Response", "DS_RESPONSE"]).trim();
    // Redsys: 0000–0099 = autorizada (no basta con === 0: p. ej. "0045" es éxito).
    const responseNum = parseInt(dsResponse, 10);
    const authorized = !Number.isNaN(responseNum) && responseNum >= 0 && responseNum <= 99;
    if (!authorized) {
      console.log("redsys_notify_declined", { dsResponse });
      return new Response("OK", { status: 200, headers: { "Content-Type": "text/plain" } });
    }

    const dsOrder = pick(decoded, ["Ds_Order", "DS_ORDER"]);
    if (!dsOrder) {
      console.warn("redsys_notify_missing_order_or_data");
      return new Response("OK", { status: 200, headers: { "Content-Type": "text/plain" } });
    }

    const merchantDataB64 = extractMerchantDataB64(decoded) || pick(decoded, [
      "Ds_MerchantData",
      "DS_MERCHANTDATA",
      "Ds_Merchant_MerchantData",
      "DS_MERCHANT_MERCHANTDATA",
    ]);

    const admin = createClient(supabaseUrl, serviceKey);

    const { data: existing } = await admin
      .from("orders")
      .select("id, status, shipping_address, email, subtotal, shipping, total, pending_cart_snapshot")
      .eq("stripe_session_id", dsOrder)
      .maybeSingle();

    let payload: MerchantPayload | null = merchantDataB64 ? decodeMerchantDataB64(merchantDataB64) : null;

    if ((!payload?.email || !payload.lines?.length) && existing && String(existing.status) === "pending_payment") {
      const fromDb = payloadFromPendingRow(existing as PendingOrderRow);
      if (fromDb) {
        console.log("redsys_notify_payload_from_snapshot");
        payload = fromDb;
      }
    }

    if (!payload?.email || !payload.lines?.length) {
      console.warn("redsys_notify_bad_merchant_payload");
      return new Response("OK", { status: 200, headers: { "Content-Type": "text/plain" } });
    }

    const subtotal = Number(payload.subtotalEur);
    const shipping = Number(payload.shippingEur);
    const total = subtotal + shipping;
    const shipFromPayload = shippingAddressFromPayload(
      payload.shippingAddress ?? payload.shipping_address,
    );

    const shippingFromRow = (row: unknown): Record<string, string> | null => {
      if (!row || typeof row !== "object") return null;
      return shippingAddressFromPayload(row as MerchantShippingAddress);
    };

    const resolvedShipping =
      shipFromPayload ?? shippingFromRow(existing?.shipping_address ?? null);

    const productIds = payload.lines.map((l) => l.productId);
    const { data: products } = await admin.from("products").select("id, name, price").in("id", productIds);
    const priceById = new Map((products ?? []).map((p) => [String(p.id), Number(p.price)]));

    const buildOrderItems = (orderId: string) =>
      payload.lines.map((line) => {
        const unit = priceById.get(String(line.productId)) ?? 0;
        const name = (products ?? []).find((p) => String(p.id) === String(line.productId))?.name ?? "Producto";
        return {
          order_id: orderId,
          product_id: line.productId,
          product_name: String(name),
          quantity: line.quantity,
          unit_price: unit,
        };
      });

    if (existing?.id) {
      const status = String(existing.status ?? "");
      if (status === "pending_payment") {
        const keepAddress = resolvedShipping ?? shippingFromRow(existing.shipping_address);
        const { data: updated, error: upErr } = await admin
          .from("orders")
          .update({
            status: "paid",
            email: payload.email,
            subtotal,
            shipping,
            total,
            shipping_address: keepAddress ?? existing.shipping_address,
            pending_cart_snapshot: null,
          })
          .eq("id", existing.id)
          .eq("status", "pending_payment")
          .select("id");

        if (upErr) {
          console.error("redsys_notify_pending_update", upErr);
        } else if (updated?.length) {
          const orderItems = buildOrderItems(existing.id as string);
          const { error: itemsErr } = await admin.from("order_items").insert(orderItems);
          if (itemsErr) {
            console.error("redsys_notify_order_items", itemsErr);
          }
        } else {
          const { data: fresh } = await admin.from("orders").select("status").eq("id", existing.id).maybeSingle();
          if (fresh?.status === "paid") {
            const { count: itemCount } = await admin
              .from("order_items")
              .select("id", { count: "exact", head: true })
              .eq("order_id", existing.id);
            if (!itemCount) {
              const orderItems = buildOrderItems(existing.id as string);
              const { error: itemsErr2 } = await admin.from("order_items").insert(orderItems);
              if (itemsErr2) console.error("redsys_notify_order_items_retry", itemsErr2);
            }
          }
        }
        return new Response("OK", { status: 200, headers: { "Content-Type": "text/plain" } });
      }
      return new Response("OK", { status: 200, headers: { "Content-Type": "text/plain" } });
    }

    const shipping_address = resolvedShipping;

    const { data: orderRow, error: orderErr } = await admin
      .from("orders")
      .insert({
        email: payload.email,
        status: "paid",
        subtotal,
        shipping,
        total,
        stripe_session_id: dsOrder,
        shipping_address,
      })
      .select("id")
      .single();

    if (orderErr || !orderRow?.id) {
      console.error("redsys_notify_order_insert", orderErr);
      return new Response("OK", { status: 200, headers: { "Content-Type": "text/plain" } });
    }

    const orderId = orderRow.id as string;
    const orderItems = buildOrderItems(orderId);

    const { error: itemsErr } = await admin.from("order_items").insert(orderItems);
    if (itemsErr) {
      console.error("redsys_notify_order_items", itemsErr);
    }

    return new Response("OK", { status: 200, headers: { "Content-Type": "text/plain" } });
  } catch (e) {
    console.error("redsys_notify_error", e instanceof Error ? e.message : e);
    return new Response("Error", { status: 500 });
  }
});

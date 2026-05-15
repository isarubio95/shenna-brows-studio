import { useCart } from "@/context/CartContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import AnimatedSection from "@/components/AnimatedSection";
import { Link } from "react-router-dom";
import { ArrowLeft, Loader2 } from "lucide-react";
import {
  getProvinceOptionsGrouped,
  getProvinceOptionByCode,
  getShippingEurForProvinceCode,
  SHIPPING_PRICE_LEGEND,
} from "@/data/shipping-provinces";
import { supabase } from "@/integrations/supabase/client";
import { useMemo, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import Turnstile from "react-turnstile";
import { getTurnstileSiteKey, getVisitorId, isCloudflareProtectionEnabled } from "@/lib/security";

const emptyShipping = {
  name: "",
  line1: "",
  line2: "",
  postal_code: "",
  city: "",
  province: "",
  province_code: "",
  phone: "",
};

const Checkout = () => {
  const { items, totalPrice } = useCart();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [shipping, setShipping] = useState(emptyShipping);
  const [turnstileToken, setTurnstileToken] = useState("");
  const [cooldownUntil, setCooldownUntil] = useState<number | null>(null);
  const { toast } = useToast();
  const turnstileSiteKey = getTurnstileSiteKey();
  const cloudflareProtectionEnabled = isCloudflareProtectionEnabled();
  const cooldownMs = cooldownUntil ? Math.max(0, cooldownUntil - Date.now()) : 0;
  const cooldownSeconds = Math.ceil(cooldownMs / 1000);
  const isCooldownActive = cooldownMs > 0;

  const provinceGroups = useMemo(() => getProvinceOptionsGrouped(), []);
  const shippingEur = getShippingEurForProvinceCode(shipping.province_code, shipping.city);
  const canQuoteShipping = shippingEur != null;
  const total = totalPrice + (shippingEur ?? 0);

  const submitPayment = async (payMethod?: string) => {
    if (!email) {
      toast({ title: "Introduce tu email", variant: "destructive" });
      return;
    }
    const quoted = getShippingEurForProvinceCode(shipping.province_code.trim(), shipping.city.trim());
    if (!shipping.province_code.trim() || quoted == null) {
      toast({
        title: "Elige tu provincia",
        description: "Selecciona la provincia de envío en el desplegable para calcular el envío.",
        variant: "destructive",
      });
      return;
    }
    const ship = {
      name: shipping.name.trim(),
      line1: shipping.line1.trim(),
      line2: shipping.line2.trim(),
      postal_code: shipping.postal_code.trim(),
      city: shipping.city.trim(),
      province: shipping.province.trim() || getProvinceOptionByCode(shipping.province_code)?.label || "",
      province_code: shipping.province_code.trim().toUpperCase(),
      phone: shipping.phone.trim(),
      country: shipping.province_code.trim().toUpperCase() === "PT" ? "PRT" : "ESP",
    };
    const missing: string[] = [];
    if (!ship.name) missing.push("nombre completo");
    if (!ship.line1) missing.push("dirección");
    if (!ship.postal_code) missing.push("código postal");
    if (!ship.city) missing.push("localidad");
    if (!ship.phone) missing.push("teléfono");
    if (missing.length > 0) {
      toast({
        title: "Completa la dirección de envío",
        description: `Falta: ${missing.join(", ")}`,
        variant: "destructive",
      });
      return;
    }
    if (isCooldownActive) {
      toast({ title: "Espera antes de reintentar", description: `${cooldownSeconds}s`, variant: "destructive" });
      return;
    }
    if (cloudflareProtectionEnabled && !turnstileToken) {
      toast({ title: "Verifica el desafío de seguridad", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-payment", {
        headers: {
          "x-visitor-id": getVisitorId(),
        },
        body: {
          items: items.map((i) => ({
            productId: i.product.id,
            quantity: i.quantity,
            ...(i.colorVariant?.id ? { colorVariantId: i.colorVariant.id } : {}),
          })),
          customerEmail: email,
          shippingAddress: ship,
          turnstileToken: cloudflareProtectionEnabled ? turnstileToken : "",
          ...(payMethod ? { payMethod } : { payMethods: "all" }),
        },
      });
      if (error) throw error;
      if (
        data?.redsysUrl &&
        data?.Ds_MerchantParameters &&
        data?.Ds_Signature &&
        data?.Ds_SignatureVersion
      ) {
        const form = document.createElement("form");
        form.method = "POST";
        form.action = data.redsysUrl as string;
        form.acceptCharset = "UTF-8";
        const fields: Array<[string, string]> = [
          ["Ds_SignatureVersion", data.Ds_SignatureVersion as string],
          ["Ds_MerchantParameters", data.Ds_MerchantParameters as string],
          ["Ds_Signature", data.Ds_Signature as string],
        ];
        for (const [name, value] of fields) {
          const input = document.createElement("input");
          input.type = "hidden";
          input.name = name;
          input.value = value;
          form.appendChild(input);
        }
        document.body.appendChild(form);
        form.submit();
      } else {
        throw new Error("No se recibieron datos de la pasarela de pago");
      }
    } catch (err: unknown) {
      const error = err instanceof Error ? err : new Error("Error inesperado");
      const maybeStatus = (err as { context?: { status?: number }; status?: number } | undefined)?.context?.status
        ?? (err as { status?: number } | undefined)?.status;
      if (maybeStatus === 429) {
        setCooldownUntil(Date.now() + 30000);
      }
      toast({ title: "Error al procesar el pago", description: error.message, variant: "destructive" });
    } finally {
      setTurnstileToken("");
      setLoading(false);
    }
  };

  const handlePayment = (e: React.FormEvent) => {
    e.preventDefault();
    void submitPayment();
  };

  const handleBizumPayment = (e: React.MouseEvent) => {
    e.preventDefault();
    void submitPayment("z");
  };

  if (items.length === 0) {
    return (
      <main className="min-h-screen bg-cream pt-32 flex items-center justify-center">
        <div className="text-center">
          <h1 className="font-playfair text-3xl text-carbon mb-4">Tu carrito está vacío</h1>
          <Link to="/" className="text-gold hover:underline">Explorar productos</Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-cream pt-28 pb-16">
      <div className="container mx-auto px-6 max-w-4xl">
        <AnimatedSection>
          <Link to="/" className="inline-flex items-center gap-2 text-carbon/50 hover:text-gold transition-colors text-sm mb-8">
            <ArrowLeft size={16} />
            Seguir comprando
          </Link>
        </AnimatedSection>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-12">
          {/* Form */}
          <AnimatedSection className="lg:col-span-3">
            <h1 className="font-playfair text-3xl font-bold text-carbon mb-8">Datos de contacto y envío</h1>
            <form className="space-y-6" onSubmit={handlePayment}>
              <div className="space-y-2">
                <Label htmlFor="email" className="text-carbon/70 text-sm">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="maria@ejemplo.com"
                  className="bg-white border-gold/15 focus:border-gold"
                />
              </div>

              <div className="space-y-4 pt-2 border-t border-gold/10">
                <h2 className="font-playfair text-lg font-semibold text-carbon">Dirección de envío</h2>
                <div className="space-y-2">
                  <Label htmlFor="ship-name" className="text-carbon/70 text-sm">Nombre y apellidos *</Label>
                  <Input
                    id="ship-name"
                    value={shipping.name}
                    onChange={(e) => setShipping((s) => ({ ...s, name: e.target.value }))}
                    placeholder="María García López"
                    maxLength={120}
                    className="bg-white border-gold/15 focus:border-gold"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ship-line1" className="text-carbon/70 text-sm">Dirección (calle y número) *</Label>
                  <Input
                    id="ship-line1"
                    value={shipping.line1}
                    onChange={(e) => setShipping((s) => ({ ...s, line1: e.target.value }))}
                    placeholder="Calle Ejemplo 12, 2º B"
                    maxLength={200}
                    className="bg-white border-gold/15 focus:border-gold"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ship-line2" className="text-carbon/70 text-sm">Complemento (opcional)</Label>
                  <Input
                    id="ship-line2"
                    value={shipping.line2}
                    onChange={(e) => setShipping((s) => ({ ...s, line2: e.target.value }))}
                    placeholder="Portal, escalera…"
                    maxLength={120}
                    className="bg-white border-gold/15 focus:border-gold"
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="ship-cp" className="text-carbon/70 text-sm">Código postal *</Label>
                    <Input
                      id="ship-cp"
                      value={shipping.postal_code}
                      onChange={(e) => setShipping((s) => ({ ...s, postal_code: e.target.value }))}
                      placeholder="28001"
                      maxLength={12}
                      inputMode="numeric"
                      className="bg-white border-gold/15 focus:border-gold"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="ship-city" className="text-carbon/70 text-sm">Localidad *</Label>
                    <Input
                      id="ship-city"
                      value={shipping.city}
                      onChange={(e) => setShipping((s) => ({ ...s, city: e.target.value }))}
                      placeholder="Madrid"
                      maxLength={120}
                      className="bg-white border-gold/15 focus:border-gold"
                    />
                  </div>
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="ship-province" className="text-carbon/70 text-sm">Provincia (España o Portugal) *</Label>
                  <Select
                    value={shipping.province_code || undefined}
                    onValueChange={(code) => {
                      const opt = getProvinceOptionByCode(code);
                      setShipping((s) => ({
                        ...s,
                        province_code: code,
                        province: opt?.label ?? "",
                      }));
                    }}
                  >
                    <SelectTrigger
                      id="ship-province"
                      className="bg-white border-gold/15 focus:border-gold w-full h-10"
                    >
                      <SelectValue placeholder="Selecciona tu provincia" />
                    </SelectTrigger>
                    <SelectContent className="max-h-72">
                      {provinceGroups.map(({ ccaa, provinces }) => (
                        <SelectGroup key={ccaa}>
                          <SelectLabel className="text-carbon/80">{ccaa}</SelectLabel>
                          {provinces.map((p) => (
                            <SelectItem key={p.code} value={p.code}>
                              {p.label}
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-carbon/45 leading-relaxed">{SHIPPING_PRICE_LEGEND}</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ship-phone" className="text-carbon/70 text-sm">Teléfono *</Label>
                  <Input
                    id="ship-phone"
                    type="tel"
                    value={shipping.phone}
                    onChange={(e) => setShipping((s) => ({ ...s, phone: e.target.value }))}
                    placeholder="+34 600 000 000"
                    maxLength={32}
                    className="bg-white border-gold/15 focus:border-gold"
                  />
                </div>
              </div>

              <p className="text-xs text-carbon/40 leading-relaxed">
                Serás redirigido a la pasarela segura de Redsys (tarjeta; Apple Pay en Safari si el banco lo tiene activo).
                Para Bizum, usa el botón dedicado. La dirección se guardará con tu pedido para el envío.
              </p>

              <div className="space-y-3 mt-4">
                <Button
                  type="submit"
                  disabled={loading || isCooldownActive || !canQuoteShipping}
                  className="w-full bg-gold hover:bg-gold/90 text-white py-6 text-base tracking-wide rounded-full shadow-[0_8px_30px_rgba(197,160,89,0.3)]"
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Procesando...
                    </>
                  ) : canQuoteShipping ? (
                    `Pagar €${total.toFixed(2)}`
                  ) : (
                    "Selecciona provincia para continuar"
                  )}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  disabled={loading || isCooldownActive || !canQuoteShipping}
                  onClick={handleBizumPayment}
                  className="w-full border-gold/30 text-carbon hover:bg-gold/5 py-5 text-sm tracking-wide rounded-full"
                >
                  Pagar con Bizum
                </Button>
              </div>
              {isCooldownActive ? (
                <p className="text-xs text-center text-carbon/60">
                  Espera {cooldownSeconds}s antes de volver a intentar.
                </p>
              ) : null}
              {cloudflareProtectionEnabled && turnstileSiteKey ? (
                <div className="w-full">
                  <Turnstile
                    sitekey={turnstileSiteKey}
                    onVerify={(token) => setTurnstileToken(token)}
                    onExpire={() => setTurnstileToken("")}
                    onError={() => setTurnstileToken("")}
                    options={{ theme: "light", size: "flexible" }}
                  />
                </div>
              ) : null}
            </form>
          </AnimatedSection>

          {/* Summary */}
          <AnimatedSection delay={0.1} className="lg:col-span-2">
            <div className="bg-white rounded-2xl p-6 shadow-[0_4px_20px_rgba(0,0,0,0.04)] sticky top-28">
              <h2 className="font-playfair text-lg font-semibold text-carbon mb-6">Resumen</h2>
              <div className="space-y-4 mb-6">
                {items.map((item) => (
                  <div key={item.lineId} className="flex justify-between text-sm gap-3">
                    <span className="text-carbon/70 min-w-0">
                      <span className="block truncate">{item.product.name}</span>
                      {item.colorVariant ? (
                        <span className="mt-0.5 flex items-center gap-1.5 text-xs text-carbon/50">
                          <span
                            className="h-2.5 w-2.5 shrink-0 rounded-full border border-carbon/10"
                            style={{ backgroundColor: item.colorVariant.hex }}
                          />
                          {item.colorVariant.name}
                        </span>
                      ) : null}
                      <span className="block text-carbon/50">× {item.quantity}</span>
                    </span>
                    <span className="text-carbon font-medium shrink-0">
                      €{(item.product.price * item.quantity).toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>
              <div className="border-t border-gold/10 pt-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-carbon/60">Subtotal</span>
                  <span className="text-carbon">€{totalPrice.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-carbon/60">Envío</span>
                  <span className="text-carbon">
                    {canQuoteShipping
                      ? shippingEur === 0
                        ? "Gratis"
                        : `€${shippingEur!.toFixed(2)}`
                      : "—"}
                  </span>
                </div>
                {!canQuoteShipping ? (
                  <p className="text-xs text-carbon/45">
                    Elige provincia en el formulario para ver el importe de envío y el total.
                  </p>
                ) : null}
                <div className="border-t border-gold/10 pt-3 flex justify-between">
                  <span className="font-medium text-carbon">Total</span>
                  <span className="font-playfair text-xl font-bold text-carbon">
                    {canQuoteShipping ? `€${total.toFixed(2)}` : "—"}
                  </span>
                </div>
              </div>
            </div>
          </AnimatedSection>
        </div>
      </div>
    </main>
  );
};

export default Checkout;

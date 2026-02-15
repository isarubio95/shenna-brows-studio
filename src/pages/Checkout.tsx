import { useCart } from "@/context/CartContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import AnimatedSection from "@/components/AnimatedSection";
import { Link } from "react-router-dom";
import { ArrowLeft, Loader2 } from "lucide-react";
import { getShippingCost, FREE_SHIPPING_THRESHOLD } from "@/data/products";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

const Checkout = () => {
  const { items, totalPrice } = useCart();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const { toast } = useToast();

  const shipping = getShippingCost(totalPrice);
  const total = totalPrice + shipping;

  const handlePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      toast({ title: "Introduce tu email", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-payment", {
        body: {
          items: items.map((i) => ({
            stripe_price_id: i.product.stripe_price_id,
            quantity: i.quantity,
            price: i.product.price,
          })),
          customerEmail: email,
        },
      });
      if (error) throw error;
      if (data?.url) {
        window.location.href = data.url;
      } else {
        throw new Error("No checkout URL returned");
      }
    } catch (err: any) {
      toast({ title: "Error al procesar el pago", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
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
            <h1 className="font-playfair text-3xl font-bold text-carbon mb-8">Datos de Contacto</h1>
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
              <p className="text-xs text-carbon/40">
                La dirección de envío se solicita en la página de pago seguro de Stripe.
              </p>

              <Button
                type="submit"
                disabled={loading}
                className="w-full bg-gold hover:bg-gold/90 text-white py-6 text-base tracking-wide rounded-full shadow-[0_8px_30px_rgba(197,160,89,0.3)] mt-4"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Procesando...
                  </>
                ) : (
                  `Pagar €${total.toFixed(2)}`
                )}
              </Button>
            </form>
          </AnimatedSection>

          {/* Summary */}
          <AnimatedSection delay={0.1} className="lg:col-span-2">
            <div className="bg-white rounded-2xl p-6 shadow-[0_4px_20px_rgba(0,0,0,0.04)] sticky top-28">
              <h2 className="font-playfair text-lg font-semibold text-carbon mb-6">Resumen</h2>
              <div className="space-y-4 mb-6">
                {items.map((item) => (
                  <div key={item.product.id} className="flex justify-between text-sm">
                    <span className="text-carbon/70">
                      {item.product.name} × {item.quantity}
                    </span>
                    <span className="text-carbon font-medium">
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
                  <span className={shipping === 0 ? "text-green-600 font-medium" : "text-carbon"}>
                    {shipping === 0 ? "GRATIS" : `€${shipping.toFixed(2)}`}
                  </span>
                </div>
                {shipping > 0 && (
                  <p className="text-xs text-carbon/40">
                    Envío gratis en pedidos de €{FREE_SHIPPING_THRESHOLD}+
                  </p>
                )}
                <div className="border-t border-gold/10 pt-3 flex justify-between">
                  <span className="font-medium text-carbon">Total</span>
                  <span className="font-playfair text-xl font-bold text-carbon">€{total.toFixed(2)}</span>
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

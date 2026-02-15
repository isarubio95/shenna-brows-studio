import { useCart } from "@/context/CartContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import AnimatedSection from "@/components/AnimatedSection";
import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

const Checkout = () => {
  const { items, totalPrice } = useCart();

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
            <h1 className="font-playfair text-3xl font-bold text-carbon mb-8">Datos de Envío</h1>
            <form className="space-y-6" onSubmit={(e) => e.preventDefault()}>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name" className="text-carbon/70 text-sm">Nombre completo</Label>
                  <Input id="name" placeholder="María García" className="bg-white border-gold/15 focus:border-gold" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-carbon/70 text-sm">Email</Label>
                  <Input id="email" type="email" placeholder="maria@ejemplo.com" className="bg-white border-gold/15 focus:border-gold" />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="address" className="text-carbon/70 text-sm">Dirección</Label>
                <Input id="address" placeholder="Calle Principal 123" className="bg-white border-gold/15 focus:border-gold" />
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="city" className="text-carbon/70 text-sm">Ciudad</Label>
                  <Input id="city" placeholder="Madrid" className="bg-white border-gold/15 focus:border-gold" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="zip" className="text-carbon/70 text-sm">Código postal</Label>
                  <Input id="zip" placeholder="28001" className="bg-white border-gold/15 focus:border-gold" />
                </div>
                <div className="space-y-2 col-span-2 sm:col-span-1">
                  <Label htmlFor="phone" className="text-carbon/70 text-sm">Teléfono</Label>
                  <Input id="phone" placeholder="+34 600 000 000" className="bg-white border-gold/15 focus:border-gold" />
                </div>
              </div>

              <Button
                type="submit"
                className="w-full bg-gold hover:bg-gold/90 text-white py-6 text-base tracking-wide rounded-full shadow-[0_8px_30px_rgba(197,160,89,0.3)] mt-4"
              >
                Proceder al Pago
              </Button>
              <p className="text-xs text-carbon/40 text-center">
                La integración de pago con Stripe se activará próximamente.
              </p>
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
              <div className="border-t border-gold/10 pt-4 flex justify-between">
                <span className="font-medium text-carbon">Total</span>
                <span className="font-playfair text-xl font-bold text-carbon">€{totalPrice.toFixed(2)}</span>
              </div>
            </div>
          </AnimatedSection>
        </div>
      </div>
    </main>
  );
};

export default Checkout;

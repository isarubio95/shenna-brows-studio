import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import AnimatedSection from "@/components/AnimatedSection";
import { CheckCircle } from "lucide-react";
import { useEffect } from "react";
import { useCart } from "@/context/CartContext";

const PaymentSuccess = () => {
  const { clearCart } = useCart();

  useEffect(() => {
    clearCart();
  }, [clearCart]);

  return (
    <main className="min-h-screen bg-cream pt-32 flex items-center justify-center">
      <AnimatedSection>
        <div className="text-center max-w-md mx-auto px-6">
          <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-green-100 flex items-center justify-center">
            <CheckCircle size={40} className="text-green-600" />
          </div>
          <h1 className="font-playfair text-3xl font-bold text-carbon mb-4">¡Pago completado!</h1>
          <p className="text-carbon/60 mb-8">
            Tu pedido ha sido procesado correctamente. Recibirás un email de confirmación en breve.
          </p>
          <Link to="/">
            <Button className="bg-gold hover:bg-gold/90 text-white px-8 py-6 rounded-full">
              Volver al inicio
            </Button>
          </Link>
        </div>
      </AnimatedSection>
    </main>
  );
};

export default PaymentSuccess;

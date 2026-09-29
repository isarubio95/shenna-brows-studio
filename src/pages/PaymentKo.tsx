import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import AnimatedSection from "@/components/AnimatedSection";
import { XCircle } from "lucide-react";
import { useHeroCtaStyle } from "@/hooks/use-hero-cta-style";
import { SITE_CTA_CLASS } from "@/lib/site-cta";

const PaymentKo = () => {
  const heroCtaStyle = useHeroCtaStyle();

  return (
    <main className="min-h-screen bg-cream pt-40 flex items-center justify-center">
      <AnimatedSection>
        <div className="text-center max-w-md mx-auto px-6">
          <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-red-100 flex items-center justify-center">
            <XCircle size={40} className="text-red-600" />
          </div>
          <h1 className="font-playfair text-3xl font-bold text-carbon mb-4">Pago no completado</h1>
          <p className="text-carbon/60 mb-8">
            La operación no se ha finalizado o ha sido rechazada. No se ha realizado ningún cargo. Puedes volver al
            checkout e intentarlo de nuevo.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link to="/checkout">
              <Button className={`${SITE_CTA_CLASS} w-full sm:w-auto`} style={heroCtaStyle}>
                Volver al checkout
              </Button>
            </Link>
            <Link to="/">
              <Button variant="outline" className={`${SITE_CTA_CLASS} w-full sm:w-auto`} style={heroCtaStyle}>
                Inicio
              </Button>
            </Link>
          </div>
        </div>
      </AnimatedSection>
    </main>
  );
};

export default PaymentKo;

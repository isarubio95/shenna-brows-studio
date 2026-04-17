import { FormEvent, useState } from "react";
import { Link } from "react-router-dom";
import { Instagram, Mail } from "lucide-react";
import logo from "@/assets/logo-shenna.png";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

const SUPABASE_URL =
  import.meta.env.VITE_SUPABASE_URL ?? "https://vanhsuisvxvclxdgutaw.supabase.co";
const NEWSLETTER_ENDPOINT = `${SUPABASE_URL}/functions/v1/newsletter-subscribe`;

const Footer = () => {
  const { toast } = useToast();
  const [newsletterEmail, setNewsletterEmail] = useState("");
  const [privacyAccepted, setPrivacyAccepted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleNewsletterSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const email = newsletterEmail.trim().toLowerCase();

    if (!email) {
      toast({ title: "Introduce tu email", variant: "destructive" });
      return;
    }
    if (!privacyAccepted) {
      toast({
        title: "Debes aceptar la política de privacidad",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      const response = await fetch(NEWSLETTER_ENDPOINT, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          email,
          privacyAccepted: true,
          source: "footer_form",
          action: "subscribe",
        }),
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result?.error || "No se pudo completar la suscripción");
      }

      toast({
        title: "Suscripción completada",
        description: "Te avisaremos por email de nuestras novedades y lanzamientos.",
      });
      setNewsletterEmail("");
      setPrivacyAccepted(false);
    } catch (error) {
      toast({
        title: "No se pudo completar la suscripción",
        description: error instanceof Error ? error.message : "Inténtalo de nuevo en unos minutos.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <footer className="border-t border-gold/30" style={{ backgroundColor: "var(--theme-footer-bg, #451a03)", color: "var(--theme-footer-text, #F9F7F2)" }}>
      <div className="container mx-auto px-6 pt-16 pb-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12">
        {/* Brand */}
        <div>
          <Link to="/"><img src={logo} alt="Shenna Brows" className="h-12 w-auto mb-4 brightness-0 invert" /></Link>
          <p className="text-sm leading-relaxed text-cream/60 max-w-xs">
            Herramientas profesionales de cejas con acero inoxidable italiano. Precisión creada desde la experiencia.
          </p>
        </div>

        {/* Links */}
        <div>
          <h4 className="font-semibold text-cream text-sm uppercase tracking-widest mb-4">Navegación</h4>
          <ul className="space-y-3 text-sm">
            {[
              { label: "Inicio", to: "/" },
              { label: "Tienda", to: "/tienda" },
              { label: "Pinzas", to: "/pinzas" },
              { label: "Tijeras", to: "/tijeras" },
              { label: "Sobre mí", to: "/sobre-mi" },
            ].map((l) => (
              <li key={l.to}>
                <Link to={l.to} className="hover:text-gold transition-colors">
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        {/* Legal */}
        <div>
          <h4 className="font-semibold text-cream text-sm uppercase tracking-widest mb-4">Legal</h4>
          <ul className="space-y-3 text-sm">
            {[
              { label: "Política de privacidad", to: "/politica-privacidad" },
              { label: "Política de devoluciones", to: "/politica-devoluciones" },
              { label: "Aviso legal y condiciones", to: "/aviso-legal" },
              { label: "Política de cookies", to: "/politica-cookies" },
            ].map((l) => (
              <li key={l.to}>
                <Link to={l.to} className="hover:text-gold transition-colors">
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

          {/* Contact + newsletter */}
          <div>
            <h4 className="font-semibold text-cream text-sm uppercase tracking-widest mb-4">Contacto</h4>
            <div className="flex gap-4 mb-4">
              <a href="https://www.instagram.com/alexandralasherasmicro/" className="hover:text-gold transition-colors" aria-label="Instagram" rel="noopener noreferrer" target="_blank">
                <Instagram size={20} />
              </a>
              <a href="mailto:info@shennabrows.com" className="hover:text-gold transition-colors" aria-label="Email">
                <Mail size={20} />
              </a>
            </div>

            <div className="space-y-3">
              <h5 className="text-xs uppercase tracking-widest text-cream/80">Newsletter</h5>
              <form className="space-y-3" onSubmit={handleNewsletterSubmit}>
                <Input
                  type="email"
                  value={newsletterEmail}
                  onChange={(event) => setNewsletterEmail(event.target.value)}
                  placeholder="tu@email.com"
                  className="bg-cream/10 border-cream/20 text-cream placeholder:text-cream/40"
                />
                <label className="flex items-start gap-2 text-xs text-cream/70 leading-relaxed">
                  <Checkbox
                    checked={privacyAccepted}
                    onCheckedChange={(value) => setPrivacyAccepted(value === true)}
                    className="mt-0.5 border-cream/50 data-[state=checked]:bg-gold data-[state=checked]:border-gold"
                  />
                  <span>
                    Acepto la{" "}
                    <Link to="/politica-privacidad" className="text-gold hover:underline">
                      política de privacidad
                    </Link>
                    &nbsp; y doy mi consentimiento para recibir la newsletter.
                  </span>
                </label>
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full bg-gold hover:bg-gold/90 text-white"
                >
                  {isSubmitting ? "Suscribiendo..." : "Suscribirme"}
                </Button>
              </form>
            </div>
          </div>
        </div>
        <div className="border-t border-cream/10 mt-12 pt-8 text-center text-xs text-cream/40">
          © {new Date().getFullYear()} Shenna BROWS. Todos los derechos reservados.
        </div>
      </div>
    </footer>
  );
};

export default Footer;

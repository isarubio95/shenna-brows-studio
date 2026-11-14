import { FormEvent, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { useHeroCtaStyle } from "@/hooks/use-hero-cta-style";
import { subscribeToNewsletter, type NewsletterSource } from "@/lib/newsletter";
import { siteCtaClass } from "@/lib/site-cta";

type NewsletterSignupDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  source: NewsletterSource;
};

/** Ventana con email + consentimiento; la usa el botón de la campaña. */
const NewsletterSignupDialog = ({
  open,
  onOpenChange,
  title,
  description,
  source,
}: NewsletterSignupDialogProps) => {
  const { toast } = useToast();
  const heroCtaStyle = useHeroCtaStyle();
  const [email, setEmail] = useState("");
  const [privacyAccepted, setPrivacyAccepted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setEmail("");
      setPrivacyAccepted(false);
    }
  }, [open]);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const normalized = email.trim().toLowerCase();
    if (!normalized) {
      toast({ title: "Introduce tu email", variant: "destructive" });
      return;
    }
    if (!privacyAccepted) {
      toast({ title: "Debes aceptar la política de privacidad", variant: "destructive" });
      return;
    }

    setSubmitting(true);
    try {
      const result = await subscribeToNewsletter(normalized, source);
      toast({
        title: result.alreadySubscribed ? "Ya estabas suscrita" : "¡Te has suscrito!",
        description: result.welcomeEmailSent
          ? "Te hemos enviado un email de bienvenida."
          : "Te avisaremos por email de nuestras novedades.",
      });
      onOpenChange(false);
    } catch (error) {
      toast({
        title: "No se pudo completar la suscripción",
        description: error instanceof Error ? error.message : "Inténtalo de nuevo.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[min(100vw-1.5rem,24rem)] gap-0 border-gold/20 bg-cream p-6 sm:rounded-2xl">
        <form onSubmit={handleSubmit} className="flex flex-col">
          <DialogTitle className="px-6 text-center font-playfair text-2xl font-bold text-carbon">
            {title}
          </DialogTitle>
          <DialogDescription className="mt-2 text-center text-sm text-carbon/70">
            {description}
          </DialogDescription>

          <div className="mt-6 space-y-4">
            <Input
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="tu@email.com"
              className="border-gold/30 bg-white text-carbon placeholder:text-carbon/60"
              required
            />
            <label className="flex items-start gap-2 text-xs leading-relaxed text-carbon/70">
              <Checkbox
                checked={privacyAccepted}
                onCheckedChange={(value) => setPrivacyAccepted(value === true)}
                className="mt-0.5 border-carbon/40 data-[state=checked]:border-gold data-[state=checked]:bg-gold"
              />
              <span>
                Acepto la{" "}
                <Link
                  to="/politica-privacidad"
                  className="text-gold underline-offset-2 hover:underline"
                  onClick={() => onOpenChange(false)}
                >
                  política de privacidad
                </Link>{" "}
                y doy mi consentimiento para recibir la newsletter.
              </span>
            </label>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className={siteCtaClass("md", "mt-6 w-full disabled:opacity-60")}
            style={heroCtaStyle}
          >
            {submitting ? "Enviando..." : "Suscribirme"}
          </button>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default NewsletterSignupDialog;

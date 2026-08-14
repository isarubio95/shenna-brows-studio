import { FormEvent, useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Sparkle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { useSiteContent } from "@/hooks/use-site-content";
import {
  DEFAULT_WELCOME_POPUP,
  parseWelcomePopupConfig,
  type WelcomePopupConfig,
} from "@/lib/welcome-popup-content";
import "animate.css";

const STORAGE_KEY = "sb_welcome_promo_seen";
const SUPABASE_URL =
  import.meta.env.VITE_SUPABASE_URL ?? "https://vanhsuisvxvclxdgutaw.supabase.co";
const NEWSLETTER_ENDPOINT = `${SUPABASE_URL}/functions/v1/newsletter-subscribe`;
/** Fondo sólido hasta que el admin suba una imagen. */
const FALLBACK_BG = "#E8DFD0";

const HIDDEN_PATHS = [
  "/checkout",
  "/admin",
  "/login",
  "/payment-success",
  "/payment-ko",
  "/politica-privacidad",
  "/politica-devoluciones",
  "/aviso-legal",
  "/politica-cookies",
];

export type WelcomePromoDialogViewProps = {
  config: WelcomePopupConfig;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Vista de prueba en admin: no marca el popup como visto. */
  preview?: boolean;
};

export const WelcomePromoDialogView = ({
  config,
  open,
  onOpenChange,
  preview = false,
}: WelcomePromoDialogViewProps) => {
  const { toast } = useToast();
  const [step, setStep] = useState<"offer" | "email">("offer");
  const [email, setEmail] = useState("");
  const [privacyAccepted, setPrivacyAccepted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const bgImage = config.imageUrl.trim();
  const pink = config.pink || DEFAULT_WELCOME_POPUP.pink;
  const gold = config.gold || DEFAULT_WELCOME_POPUP.gold;

  useEffect(() => {
    if (open) {
      setStep("offer");
      setEmail("");
      setPrivacyAccepted(false);
    }
  }, [open]);

  const dismiss = () => {
    if (!preview) {
      try {
        localStorage.setItem(STORAGE_KEY, "1");
      } catch {
        /* ignore */
      }
    }
    onOpenChange(false);
  };

  const handleOpenChange = (next: boolean) => {
    if (!next) {
      dismiss();
      return;
    }
    onOpenChange(true);
  };

  const handleSubscribe = async (event: FormEvent) => {
    event.preventDefault();
    const normalized = email.trim().toLowerCase();
    if (!normalized) {
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

    setSubmitting(true);
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
          email: normalized,
          privacyAccepted: true,
          source: "welcome_popup",
          action: "subscribe",
        }),
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result?.error || "No se pudo completar la suscripción");
      }

      toast({
        title: "¡Listo!",
        description: "Revisa tu correo: te hemos enviado tu código de descuento.",
      });
      dismiss();
      setStep("offer");
      setEmail("");
      setPrivacyAccepted(false);
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
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        className={cn(
          "max-w-[min(100vw-1.5rem,22rem)] gap-0 overflow-hidden border-0 p-0 shadow-2xl sm:rounded-2xl",
          "bg-transparent [&>button]:right-3 [&>button]:top-3 [&>button]:z-20 [&>button]:rounded-full [&>button]:bg-black/25 [&>button]:p-1.5 [&>button]:text-white [&>button]:opacity-100 [&>button]:hover:bg-black/40 [&>button]:ring-offset-0",
          "duration-0 data-[state=open]:animate-none data-[state=closed]:animate-none",
        )}
      >
        <div
          className="animate__animated animate__fadeInDown relative flex min-h-128 flex-col bg-cover bg-center"
          style={{
            backgroundColor: FALLBACK_BG,
            ...(bgImage ? { backgroundImage: `url(${bgImage})` } : {}),
          }}
          role="img"
          aria-label={config.alt}
        >
          {bgImage ? (
            <div className="pointer-events-none absolute inset-0 bg-linear-to-b from-white/55 via-white/20 to-black/35" />
          ) : null}

          <div className="relative z-10 flex flex-1 flex-col px-5 pb-5 pt-8">
            {step === "offer" ? (
              <>
                <DialogTitle className="sr-only">
                  {config.eyebrow} {config.offerAmount} {config.offerSuffix}
                </DialogTitle>
                <DialogDescription className="sr-only">
                  {config.badgeText}. {config.primaryCta} para recibir el código por email.
                </DialogDescription>

                <div className="flex flex-1 flex-col items-center text-center">
                  <p className="font-sans text-[0.7rem] font-semibold uppercase tracking-[0.28em] text-carbon/80">
                    {config.eyebrow}
                  </p>
                  <p
                    className="mt-1 font-playfair text-6xl font-bold leading-none tracking-tight sm:text-7xl"
                    style={{
                      backgroundImage: `linear-gradient(180deg, #E8D5A3 0%, ${gold} 45%, #8B6914 100%)`,
                      WebkitBackgroundClip: "text",
                      backgroundClip: "text",
                      color: "transparent",
                      textShadow: "0 1px 0 rgba(255,255,255,0.35)",
                    }}
                  >
                    {config.offerAmount}
                  </p>
                  <p className="mt-1 font-playfair text-lg font-semibold uppercase tracking-[0.12em] text-carbon/85">
                    {config.offerSuffix}
                  </p>

                  <div className="my-4 flex w-full max-w-56 items-center gap-2">
                    <span className="h-px flex-1" style={{ backgroundColor: gold }} />
                    <Sparkle className="h-3.5 w-3.5" style={{ color: gold }} fill={gold} />
                    <span className="h-px flex-1" style={{ backgroundColor: gold }} />
                  </div>

                  <p className="font-playfair text-sm font-semibold uppercase tracking-[0.12em] text-carbon/85">
                    {config.badgeText}
                  </p>

                  <div className="mt-auto w-full space-y-2.5 pt-36">
                    <button
                      type="button"
                      onClick={() => setStep("email")}
                      className="flex w-full items-center justify-center gap-2 rounded-full border border-white/70 px-4 py-3.5 font-sans text-sm font-bold uppercase tracking-[0.18em] text-white shadow-md transition hover:brightness-105"
                      style={{
                        background: `linear-gradient(90deg, ${pink} 0%, #F0A0AB 50%, ${pink} 100%)`,
                      }}
                    >
                      <Sparkle className="h-3.5 w-3.5" fill="currentColor" />
                      {config.primaryCta}
                      <Sparkle className="h-3.5 w-3.5" fill="currentColor" />
                    </button>
                    <button
                      type="button"
                      onClick={dismiss}
                      className="w-full rounded-full border px-4 py-3 font-sans text-xs font-semibold uppercase tracking-[0.18em] text-carbon/80 transition hover:bg-white/40"
                      style={{
                        borderColor: `${gold}99`,
                        backgroundColor: "rgba(249,247,242,0.55)",
                      }}
                    >
                      {config.secondaryCta}
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <form onSubmit={handleSubscribe} className="flex flex-1 flex-col">
                <DialogTitle className="text-center font-playfair text-2xl font-bold text-carbon">
                  {config.emailTitle}
                </DialogTitle>
                <DialogDescription className="mt-2 text-center text-sm text-carbon/70">
                  {config.emailDescription}
                </DialogDescription>

                <div className="mt-8 space-y-4 rounded-2xl bg-white/85 p-4 backdrop-blur-sm">
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
                        onClick={dismiss}
                      >
                        política de privacidad
                      </Link>{" "}
                      y doy mi consentimiento para recibir la newsletter.
                    </span>
                  </label>
                </div>

                <div className="mt-auto space-y-2.5 pt-6">
                  <button
                    type="submit"
                    disabled={submitting}
                    className="flex w-full items-center justify-center gap-2 rounded-full border border-white/70 px-4 py-3.5 font-sans text-sm font-bold uppercase tracking-[0.18em] text-white shadow-md transition hover:brightness-105 disabled:opacity-60"
                    style={{
                      background: `linear-gradient(90deg, ${pink} 0%, #F0A0AB 50%, ${pink} 100%)`,
                    }}
                  >
                    {submitting ? "Enviando..." : config.emailCta}
                  </button>
                  <button
                    type="button"
                    onClick={() => setStep("offer")}
                    className="w-full rounded-full border px-4 py-3 font-sans text-xs font-semibold uppercase tracking-[0.18em] text-carbon/80 transition hover:bg-white/40"
                    style={{
                      borderColor: `${gold}99`,
                      backgroundColor: "rgba(249,247,242,0.55)",
                    }}
                  >
                    Volver
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

const WelcomePromoDialog = () => {
  const location = useLocation();
  const { data: siteContent, loading: contentLoading } = useSiteContent([
    "index_welcome_popup",
  ]);
  const config = useMemo(
    () => parseWelcomePopupConfig(siteContent.index_welcome_popup?.content),
    [siteContent.index_welcome_popup?.content],
  );

  const [open, setOpen] = useState(false);

  const pathHidden = HIDDEN_PATHS.some(
    (p) => location.pathname === p || location.pathname.startsWith(`${p}/`),
  );

  useEffect(() => {
    if (pathHidden || contentLoading || !config.enabled) return;
    try {
      if (localStorage.getItem(STORAGE_KEY) === "1") return;
    } catch {
      return;
    }
    const timer = window.setTimeout(() => setOpen(true), config.delayMs);
    return () => window.clearTimeout(timer);
  }, [pathHidden, contentLoading, config.enabled, config.delayMs]);

  if (pathHidden || (!contentLoading && !config.enabled)) return null;

  return <WelcomePromoDialogView config={config} open={open} onOpenChange={setOpen} />;
};

export default WelcomePromoDialog;

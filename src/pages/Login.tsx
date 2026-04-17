import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import AnimatedSection from "@/components/AnimatedSection";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import Turnstile from "react-turnstile";
import { getTurnstileSiteKey, getVisitorId, isCloudflareProtectionEnabled } from "@/lib/security";

const SUPABASE_URL =
  import.meta.env.VITE_SUPABASE_URL ?? "https://vanhsuisvxvclxdgutaw.supabase.co";
const AUTH_RATE_LIMIT_ENDPOINT = `${SUPABASE_URL}/functions/v1/auth-rate-limit`;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? "";
type AuthGuardError = Error & { status?: number; unlockAt?: string };

const Login = () => {
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [privacyAccepted, setPrivacyAccepted] = useState(false);
  const [newsletterOptIn, setNewsletterOptIn] = useState(false);
  const [loading, setLoading] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState("");
  const [cooldownUntil, setCooldownUntil] = useState<number | null>(null);
  const [failCount, setFailCount] = useState(0);
  const { signIn, signUp } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const turnstileSiteKey = getTurnstileSiteKey();
  const cloudflareProtectionEnabled = isCloudflareProtectionEnabled();

  const cooldownMs = cooldownUntil ? Math.max(0, cooldownUntil - Date.now()) : 0;
  const cooldownSeconds = Math.ceil(cooldownMs / 1000);
  const isCooldownActive = cooldownMs > 0;

  const getBackoffMs = (nextFailCount: number) => {
    if (nextFailCount >= 5) return 30000;
    if (nextFailCount >= 3) return 15000;
    return 5000;
  };

  const callAuthGuard = async (payload: Record<string, unknown>) => {
    const visitorId = getVisitorId();
    const response = await fetch(AUTH_RATE_LIMIT_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        apikey: SUPABASE_ANON_KEY,
        "x-visitor-id": visitorId,
      },
      body: JSON.stringify(payload),
    });

    const result = await response.json();
    if (!response.ok) {
      const error: AuthGuardError = new Error(result?.error || "Error de seguridad");
      error.status = response.status;
      error.unlockAt = result?.unlockAt;
      throw error;
    }

    return result as { ok?: boolean; locked?: boolean; unlockAt?: string };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isCooldownActive) {
      toast({
        title: "Espera antes de reintentar",
        description: `Puedes volver a intentarlo en ${cooldownSeconds}s.`,
        variant: "destructive",
      });
      return;
    }
    if (cloudflareProtectionEnabled && !turnstileToken) {
      toast({ title: "Verifica el desafío de seguridad", variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      if (cloudflareProtectionEnabled) {
        await callAuthGuard({
          action: "precheck",
          email,
          turnstileToken,
        });
      }

      if (isRegister) {
        if (!privacyAccepted) {
          toast({
            title: "Debes aceptar la política de privacidad",
            variant: "destructive",
          });
          return;
        }

        const { error } = await signUp(email, password, fullName, privacyAccepted, newsletterOptIn);
        if (error) throw error;
        await callAuthGuard({ action: "report", email, success: true });
        setFailCount(0);
        toast({ title: "¡Cuenta creada!", description: "Revisa tu email para confirmar tu cuenta." });
      } else {
        const { error } = await signIn(email, password);
        if (error) throw error;
        await callAuthGuard({ action: "report", email, success: true });
        setFailCount(0);
        toast({ title: "¡Bienvenida!" });
        navigate("/");
      }
    } catch (err: unknown) {
      const safeError = err instanceof Error ? (err as AuthGuardError) : new Error("Error inesperado");
      const status = safeError.status;
      if (status === 423) {
        toast({
          title: "Cuenta temporalmente bloqueada",
          description: "Demasiados intentos fallidos. Vuelve a intentarlo más tarde.",
          variant: "destructive",
        });
      } else if (status === 429) {
        toast({
          title: "Demasiados intentos",
          description: "Has alcanzado el límite temporal. Inténtalo en unos minutos.",
          variant: "destructive",
        });
      } else if (status === 403) {
        toast({
          title: "Verificación de seguridad fallida",
          description: "Completa el desafío de seguridad y vuelve a intentar.",
          variant: "destructive",
        });
      } else {
        const nextFailCount = failCount + 1;
        const backoffMs = getBackoffMs(nextFailCount);
        setFailCount(nextFailCount);
        setCooldownUntil(Date.now() + backoffMs);
        try {
          await callAuthGuard({ action: "report", email, success: false });
        } catch {
          // No bloquea UX si falla el reporte.
        }
        toast({ title: "Error", description: safeError.message, variant: "destructive" });
      }
    } finally {
      setTurnstileToken("");
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-cream flex items-center justify-center pt-20 pb-12 px-6">
      <AnimatedSection className="w-full max-w-md">
        <div className="bg-white rounded-2xl p-8 md:p-10 shadow-[0_8px_30px_rgba(0,0,0,0.06)]">
          <Link to="/" className="block text-center mb-8">
            <h1 className="font-playfair text-2xl font-bold text-carbon">
              Shenna <span className="text-gold">BROWS</span>
            </h1>
          </Link>

          <h2 className="font-playfair text-xl font-semibold text-carbon text-center mb-6">
            {isRegister ? "Crear cuenta" : "Iniciar sesión"}
          </h2>

          <form className="space-y-5" onSubmit={handleSubmit}>
            {isRegister && (
              <div className="space-y-2">
                <Label htmlFor="name" className="text-carbon/70 text-sm">Nombre</Label>
                <Input id="name" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Tu nombre" className="bg-cream/50 border-gold/15 focus:border-gold" />
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="email" className="text-carbon/70 text-sm">Email</Label>
              <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="tu@email.com" className="bg-cream/50 border-gold/15 focus:border-gold" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="text-carbon/70 text-sm">Contraseña</Label>
              <Input id="password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" className="bg-cream/50 border-gold/15 focus:border-gold" minLength={6} />
            </div>
            {isRegister && (
              <div className="space-y-3 rounded-xl border border-gold/15 bg-cream/40 p-3.5">
                <label className="flex items-start gap-2.5 text-xs text-carbon/75 leading-relaxed">
                  <Checkbox
                    checked={privacyAccepted}
                    onCheckedChange={(value) => setPrivacyAccepted(value === true)}
                    className="mt-0.5 border-gold/30 data-[state=checked]:bg-gold data-[state=checked]:border-gold"
                  />
                  <span>
                    He leído y acepto la{" "}
                    <Link to="/politica-privacidad" className="text-gold hover:underline">
                      política de privacidad
                    </Link>
                    .
                  </span>
                </label>
                <label className="flex items-start gap-2.5 text-xs text-carbon/75 leading-relaxed">
                  <Checkbox
                    checked={newsletterOptIn}
                    onCheckedChange={(value) => setNewsletterOptIn(value === true)}
                    className="mt-0.5 border-gold/30 data-[state=checked]:bg-gold data-[state=checked]:border-gold"
                  />
                  <span>Quiero suscribirme a la newsletter (opcional).</span>
                </label>
              </div>
            )}
            <Button type="submit" disabled={loading} className="w-full bg-gold hover:bg-gold/90 text-white py-5 tracking-wide rounded-full">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : isRegister ? "Registrarse" : "Entrar"}
            </Button>
            {isCooldownActive ? (
              <p className="text-xs text-center text-carbon/60">
                Espera {cooldownSeconds}s antes de volver a enviar.
              </p>
            ) : null}
            {cloudflareProtectionEnabled && turnstileSiteKey ? (
              <div className="pt-1 w-full">
                <Turnstile
                  sitekey={turnstileSiteKey}
                  onVerify={(token) => setTurnstileToken(token)}
                  onExpire={() => setTurnstileToken("")}
                  onError={() => setTurnstileToken("")}
                  theme="light"
                  size="flexible"
                />
              </div>
            ) : (
              <p className="text-xs text-center text-carbon/50">
                Protección Cloudflare desactivada en entorno local.
              </p>
            )}
          </form>

          <p className="text-center text-sm text-carbon/50 mt-6">
            {isRegister ? "¿Ya tienes cuenta?" : "¿No tienes cuenta?"}{" "}
            <button
              onClick={() => {
                setIsRegister(!isRegister);
                setPrivacyAccepted(false);
                setNewsletterOptIn(false);
              }}
              className="text-gold hover:underline font-medium"
            >
              {isRegister ? "Inicia sesión" : "Regístrate"}
            </button>
          </p>
        </div>
      </AnimatedSection>
    </main>
  );
};

export default Login;

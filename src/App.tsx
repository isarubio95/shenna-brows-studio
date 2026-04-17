import { FormEvent, useState } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { useThemeConfig } from "@/hooks/use-theme-config";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { CartProvider } from "@/context/CartContext";
import { AuthProvider } from "@/context/AuthContext";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import CartDrawer from "@/components/CartDrawer";
import ScrollToTop from "@/components/ScrollToTop";
import Index from "./pages/Index";
import ProductPage from "./pages/ProductPage";
import Tienda from "./pages/Tienda";
import About from "./pages/About";
import Checkout from "./pages/Checkout";
import Login from "./pages/Login";
import Admin from "./pages/Admin";
import Account from "./pages/Account";
import PaymentSuccess from "./pages/PaymentSuccess";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import ReturnsPolicy from "./pages/ReturnsPolicy";
import TermsOfService from "./pages/TermsOfService";
import CookiesPolicy from "./pages/CookiesPolicy";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();
const MANTEINANCE_MODE = import.meta.env.VITE_MANTEINANCE_MODE === "true";
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL ?? "https://vanhsuisvxvclxdgutaw.supabase.co";
const NEWSLETTER_ENDPOINT = `${SUPABASE_URL}/functions/v1/newsletter-subscribe`;

const ThemeLoader = () => {
  useThemeConfig();
  return null;
};

const MaintenancePage = () => {
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [privacyAccepted, setPrivacyAccepted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleSubscribe = async (event: FormEvent) => {
    event.preventDefault();
    const normalizedEmail = email.trim().toLowerCase();

    if (!normalizedEmail) {
      toast({ title: "Introduce tu email", variant: "destructive" });
      return;
    }
    if (!privacyAccepted) {
      toast({ title: "Debes aceptar la política de privacidad", variant: "destructive" });
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch(NEWSLETTER_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: normalizedEmail,
          privacyAccepted: true,
          source: "maintenance_page",
          action: "subscribe",
        }),
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result?.error || "No se pudo completar la suscripción");
      }
      toast({
        title: "Suscripción completada",
        description: "Te avisaremos cuando abramos la web completa.",
      });
      setEmail("");
      setPrivacyAccepted(false);
    } catch (error) {
      toast({
        title: "No se pudo completar la suscripción",
        description: error instanceof Error ? error.message : "Inténtalo de nuevo en unos minutos.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen bg-cream px-6 py-12">
      <section className="w-full max-w-6xl mx-auto rounded-3xl border border-gold/20 bg-white p-8 md:p-12 text-center shadow-[0_12px_40px_rgba(0,0,0,0.08)]">
        <h1 className="font-playfair text-4xl md:text-5xl font-bold text-carbon">
          Shenna <span className="text-gold">BROWS</span>
        </h1>
        <p className="mt-6 font-playfair text-2xl md:text-3xl text-carbon">
          Estamos en plena transformación
        </p>
        <p className="mt-4 text-carbon/70 text-base md:text-lg leading-relaxed max-w-2xl mx-auto">
          Estamos puliendo cada detalle para que tu experiencia sea preciosa.
          Volvemos muy pronto con novedades bonitas, compras activadas y todo listo para ti.
        </p>
        <div className="mt-8 inline-flex rounded-full bg-gold/10 border border-gold/20 px-5 py-2 text-sm font-medium text-gold">
          Sitio temporalmente en construcción
        </div>

        <div className="mt-10 grid grid-cols-1 lg:grid-cols-2 gap-8 items-stretch text-left">
          <div className="rounded-2xl overflow-hidden shadow-[0_12px_20px_rgba(0,0,0,0.25)] backdrop-blur-sm bg-black">
            <video
              className="w-full h-full min-h-[380px] object-cover"
              src="/video-presentacion2-vertical.mp4"
              autoPlay
              muted
              controls
              playsInline
              preload="metadata"
            >
              Tu navegador no soporta la reproducción de video.
            </video>
          </div>

          <div className="rounded-2xl border border-gold/20 bg-cream/40 p-6 md:p-8 flex flex-col justify-center">
            <p className="text-xs uppercase tracking-[0.18em] text-gold font-semibold">Newsletter</p>
            <h2 className="mt-3 font-playfair text-3xl md:text-4xl font-bold text-carbon">
              Suscríbete y te avisamos los primeros
            </h2>
            <p className="mt-3 text-carbon/70">
              Recibe novedades, lanzamientos y acceso preferente cuando la web esté totalmente activa.
            </p>

            <form className="mt-6 space-y-4" onSubmit={handleSubscribe}>
              <Input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="tu@email.com"
                className="h-12 bg-white border-gold/25 focus:border-gold"
              />
              <label className="flex items-start gap-2.5 text-sm text-carbon/75 leading-relaxed">
                <Checkbox
                  checked={privacyAccepted}
                  onCheckedChange={(value) => setPrivacyAccepted(value === true)}
                  className="mt-0.5 border-gold/30 data-[state=checked]:bg-gold data-[state=checked]:border-gold"
                />
                <span>
                  Acepto la <a href="/politica-privacidad" className="text-gold hover:underline">política de privacidad</a> 
                  &nbsp; y doy mi consentimiento para recibir la newsletter.
                </span>
              </label>
              <Button
                type="submit"
                disabled={submitting}
                className="h-12 w-full bg-gold hover:bg-gold/90 text-white text-base"
              >
                {submitting ? "Suscribiendo..." : "Quiero suscribirme"}
              </Button>
            </form>
          </div>
        </div>
      </section>
    </main>
  );
};

const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <CartProvider>
            <Toaster />
            <Sonner />
            <ThemeLoader />
            {MANTEINANCE_MODE ? (
              <MaintenancePage />
            ) : (
              <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
                <ScrollToTop />
                <Navbar />
                <CartDrawer />
                <Routes>
                  <Route path="/" element={<Index />} />
                  <Route path="/tienda" element={<Tienda />} />
                  <Route path="/sobre-mi" element={<About />} />
                  <Route path="/checkout" element={<Checkout />} />
                  <Route path="/payment-success" element={<PaymentSuccess />} />
                  <Route path="/login" element={<Login />} />
                  <Route path="/admin" element={<Admin />} />
                  <Route path="/account" element={<Account />} />
                  <Route path="/politica-privacidad" element={<PrivacyPolicy />} />
                  <Route path="/politica-devoluciones" element={<ReturnsPolicy />} />
                  <Route path="/aviso-legal" element={<TermsOfService />} />
                  <Route path="/politica-cookies" element={<CookiesPolicy />} />
                  <Route path="/:slug" element={<ProductPage />} />
                  <Route path="*" element={<NotFound />} />
                </Routes>
                <Footer />
              </BrowserRouter>
            )}
          </CartProvider>
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;

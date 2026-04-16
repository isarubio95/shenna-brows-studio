import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { useThemeConfig } from "@/hooks/use-theme-config";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
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
const SHOW_FIRST_VISIT_BANNER = import.meta.env.VITE_SHOW_FIRST_VISIT_BANNER === "true";

const ThemeLoader = () => {
  useThemeConfig();
  return null;
};

const MaintenancePage = () => (
  <main className="min-h-screen bg-cream flex items-center justify-center px-6 py-12">
    <section className="w-full max-w-2xl rounded-3xl border border-gold/20 bg-white p-8 md:p-12 text-center shadow-[0_12px_40px_rgba(0,0,0,0.08)]">
      <h1 className="font-playfair text-4xl md:text-5xl font-bold text-carbon">
        Shenna <span className="text-gold">BROWS</span>
      </h1>
      <p className="mt-6 font-playfair text-2xl md:text-3xl text-carbon">
        Estamos en plena transformación
      </p>
      <p className="mt-4 text-carbon/70 text-base md:text-lg leading-relaxed">
        Estamos puliendo cada detalle para que tu experiencia sea preciosa.
        Volvemos muy pronto con novedades bonitas, compras activadas y todo listo para ti.
      </p>
      <div className="mt-8 inline-flex rounded-full bg-gold/10 border border-gold/20 px-5 py-2 text-sm font-medium text-gold">
        Sitio temporalmente en construcción
      </div>
    </section>
  </main>
);

const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <CartProvider>
            <Toaster />
            <Sonner />
            <ThemeLoader />
            {SHOW_FIRST_VISIT_BANNER ? (
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

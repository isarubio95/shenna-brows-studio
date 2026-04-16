import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { useThemeConfig } from "@/hooks/use-theme-config";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useEffect, useState } from "react";
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
const FIRST_VISIT_BANNER_KEY = "first-visit-under-construction-banner-seen";
const SHOW_FIRST_VISIT_BANNER = import.meta.env.VITE_SHOW_FIRST_VISIT_BANNER === "true";

const ThemeLoader = () => {
  useThemeConfig();
  return null;
};

const App = () => {
  const [showFirstVisitBanner, setShowFirstVisitBanner] = useState(false);

  useEffect(() => {
    if (!SHOW_FIRST_VISIT_BANNER) return;

    const hasSeenBanner = localStorage.getItem(FIRST_VISIT_BANNER_KEY) === "true";
    if (!hasSeenBanner) {
      setShowFirstVisitBanner(true);
    }
  }, []);

  const dismissFirstVisitBanner = () => {
    localStorage.setItem(FIRST_VISIT_BANNER_KEY, "true");
    setShowFirstVisitBanner(false);
  };

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <CartProvider>
            <Toaster />
            <Sonner />
            <ThemeLoader />
            {showFirstVisitBanner && (
              <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4">
                <div className="w-full max-w-lg rounded-2xl border border-primary/20 bg-background p-6 text-center shadow-2xl">
                  <p className="text-lg font-semibold text-foreground">
                    Hola! Estamos preparando la web con mucho amor
                  </p>
                  <p className="mt-2 text-sm text-muted-foreground">
                    La web esta en construccion y por ahora no se puede comprar.
                    Gracias por visitarnos mientras dejamos todo precioso.
                  </p>
                  <button
                    type="button"
                    onClick={dismissFirstVisitBanner}
                    className="mt-5 inline-flex cursor-pointer rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
                  >
                    Entendido, gracias
                  </button>
                </div>
              </div>
            )}
            <BrowserRouter>
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
          </CartProvider>
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;

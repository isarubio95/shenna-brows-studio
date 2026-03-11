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

const ThemeLoader = () => {
  useThemeConfig();
  return null;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <CartProvider>
          <Toaster />
          <Sonner />
          <ThemeLoader />
          <BrowserRouter>
            <ScrollToTop />
            <Navbar />
            <CartDrawer />
            <Routes>
              <Route path="/" element={<Index />} />
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

export default App;

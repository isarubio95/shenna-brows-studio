import { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import logo from "@/assets/logo-shenna.png";
import { ShoppingBag, User, Menu, X, Shield } from "lucide-react";
import { useCart } from "@/context/CartContext";
import { useAuth } from "@/context/AuthContext";
import { motion, AnimatePresence } from "framer-motion";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const navLinks = [
  { label: "Inicio", to: "/" },
  { label: "Pinzas", to: "/pinzas" },
  { label: "Tijeras", to: "/tijeras" },
  { label: "Gel", to: "/gel" },
  { label: "Sobre mí", to: "/sobre-mi" },
];

const Navbar = () => {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { openCart, totalItems } = useCart();
  const { user, isAdmin, profile, signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const firstName = profile?.full_name?.split(" ")[0] || "";

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
        scrolled
          ? "bg-cream/80 backdrop-blur-lg shadow-[0_2px_20px_rgba(0,0,0,0.04)]"
          : "bg-transparent"
      }`}
    >
      <nav className="container mx-auto flex items-center justify-between px-6 py-4 lg:py-5">
        <Link to="/">
          <img src={logo} alt="Shenna Brows" className="h-10 lg:h-12 w-auto" />
        </Link>

        <ul className="hidden lg:flex items-center gap-8">
          {navLinks.map((link) => (
            <li key={link.to}>
              <Link
                to={link.to}
                className={`text-sm font-medium tracking-wide transition-colors duration-300 hover:text-gold ${
                  location.pathname === link.to ? "text-gold" : "text-carbon/70"
                }`}
              >
                {link.label}
              </Link>
            </li>
          ))}
        </ul>

        <div className="flex items-center gap-4">
          {isAdmin && (
            <Link to="/admin" className="hidden lg:block text-carbon/60 hover:text-gold transition-colors" aria-label="Admin">
              <Shield size={20} />
            </Link>
          )}

          {/* User icon / dropdown */}
          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="hidden lg:flex flex-col items-center gap-0.5 text-gold transition-colors focus:outline-none" aria-label="Mi cuenta">
                  <User size={20} fill="currentColor" />
                  {firstName && (
                    <span className="text-[10px] uppercase tracking-widest text-gold/80 font-medium leading-none max-w-[60px] truncate">
                      {firstName}
                    </span>
                  )}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48 bg-card border-border z-50">
                <DropdownMenuLabel className="font-playfair text-sm">
                  Hola, {firstName || "Cliente"}
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate("/account")} className="cursor-pointer">
                  Mi Área Privada
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => signOut()} className="cursor-pointer text-destructive focus:text-destructive">
                  Cerrar Sesión
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Link to="/login" className="hidden lg:block text-carbon/60 hover:text-gold transition-colors" aria-label="Mi cuenta">
              <User size={20} />
            </Link>
          )}

          <button
            onClick={openCart}
            className="relative text-carbon/60 hover:text-gold transition-colors"
            aria-label="Carrito"
          >
            <ShoppingBag size={20} />
            {totalItems > 0 && (
              <span className="absolute -top-1.5 -right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-gold text-[10px] font-semibold text-white">
                {totalItems}
              </span>
            )}
          </button>
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="lg:hidden text-carbon/70 hover:text-gold transition-colors"
            aria-label="Menú"
          >
            {mobileOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </nav>

      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="lg:hidden overflow-hidden bg-cream/95 backdrop-blur-lg border-t border-gold/10"
          >
            <ul className="flex flex-col items-center gap-6 py-8">
              {navLinks.map((link) => (
                <li key={link.to}>
                  <Link
                    to={link.to}
                    className={`text-lg font-medium tracking-wide transition-colors ${
                      location.pathname === link.to ? "text-gold" : "text-carbon/70"
                    }`}
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
              {isAdmin && (
                <li><Link to="/admin" className="text-gold font-medium">Admin</Link></li>
              )}
              {user ? (
                <>
                  <li>
                    <Link to="/account" className="text-carbon/70 hover:text-gold transition-colors font-medium">
                      Mi Cuenta
                    </Link>
                  </li>
                  <li>
                    <button onClick={() => signOut()} className="text-carbon/60 hover:text-gold transition-colors text-sm">
                      Cerrar Sesión
                    </button>
                  </li>
                </>
              ) : (
                <li>
                  <Link to="/login" className="text-carbon/60 hover:text-gold transition-colors">
                    <User size={20} />
                  </Link>
                </li>
              )}
            </ul>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
};

export default Navbar;

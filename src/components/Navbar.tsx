import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { ShoppingBag, User, Search, Menu, X } from "lucide-react";
import { useCart } from "@/context/CartContext";
import { motion, AnimatePresence } from "framer-motion";

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
  const location = useLocation();

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
        {/* Logo */}
        <Link to="/" className="font-playfair text-2xl font-bold tracking-wide text-carbon">
          Shenna <span className="text-gold">BROWS</span>
        </Link>

        {/* Desktop nav */}
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

        {/* Icons */}
        <div className="flex items-center gap-4">
          <button className="hidden lg:block text-carbon/60 hover:text-gold transition-colors" aria-label="Buscar">
            <Search size={20} />
          </button>
          <Link to="/login" className="hidden lg:block text-carbon/60 hover:text-gold transition-colors" aria-label="Mi cuenta">
            <User size={20} />
          </Link>
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

      {/* Mobile menu */}
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
              <li className="flex gap-6 pt-2">
                <Link to="/login" className="text-carbon/60 hover:text-gold transition-colors">
                  <User size={20} />
                </Link>
                <button className="text-carbon/60 hover:text-gold transition-colors">
                  <Search size={20} />
                </button>
              </li>
            </ul>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
};

export default Navbar;

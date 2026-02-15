import { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import logo from "@/assets/logo-shenna.png";
import { ShoppingBag, User, Menu, Shield } from "lucide-react";
import { useCart } from "@/context/CartContext";
import { useAuth } from "@/context/AuthContext";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

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
  const isHome = location.pathname === "/";

  // On Home: transparent until scroll. On other pages: always solid.
  const isSolid = !isHome || scrolled;

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  // Dynamic color classes
  const linkColor = isSolid ? "text-carbon/70" : "text-white/90";
  const iconColor = isSolid ? "text-carbon/60" : "text-white/80";

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ease-in-out ${
        isSolid
          ? "bg-cream/90 backdrop-blur-lg shadow-sm"
          : "bg-transparent"
      }`}
    >
      <nav className="container mx-auto flex items-center justify-between px-6 py-4 lg:py-5">
        <Link to="/">
          <img
            src={logo}
            alt="Shenna Brows"
            className="h-10 lg:h-12 w-auto"
          />
        </Link>

        <ul className="hidden lg:flex items-center gap-8">
          {navLinks.map((link) => (
            <li key={link.to}>
              <Link
                to={link.to}
                className={`text-sm font-medium tracking-wide transition-colors duration-300 hover:text-gold ${
                  location.pathname === link.to
                    ? "text-gold"
                    : linkColor
                }`}
              >
                {link.label}
              </Link>
            </li>
          ))}
        </ul>

        <div className="flex items-center gap-4">
          {isAdmin && (
            <Link
              to="/admin"
              className={`hidden lg:block transition-colors duration-300 hover:text-gold ${iconColor}`}
              aria-label="Admin"
            >
              <Shield size={20} />
            </Link>
          )}

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
            <Link
              to="/login"
              className={`hidden lg:block transition-colors duration-300 hover:text-gold ${iconColor}`}
              aria-label="Mi cuenta"
            >
              <User size={20} />
            </Link>
          )}

          <button
            onClick={openCart}
            className={`relative transition-colors duration-300 hover:text-gold ${iconColor}`}
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
            onClick={() => setMobileOpen(true)}
            className={`lg:hidden transition-colors duration-300 hover:text-gold ${
              isSolid ? "text-carbon/70" : "text-white/90"
            }`}
            aria-label="Menú"
          >
            <Menu size={24} />
          </button>
        </div>
      </nav>

      {/* Mobile menu — Sheet from right */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="right" className="bg-cream border-l border-gold/10 w-72 flex flex-col">
          <SheetHeader className="text-right pr-2">
            <SheetTitle className="font-playfair text-gold text-lg">Menú</SheetTitle>
          </SheetHeader>

          <ul className="flex flex-col items-end gap-6 mt-8 pr-2">
            {navLinks.map((link) => (
              <li key={link.to}>
                <Link
                  to={link.to}
                  onClick={() => setMobileOpen(false)}
                  className={`text-lg font-medium tracking-wide transition-colors ${
                    location.pathname === link.to ? "text-gold" : "text-carbon/70 hover:text-gold"
                  }`}
                >
                  {link.label}
                </Link>
              </li>
            ))}
            {isAdmin && (
              <li>
                <Link to="/admin" onClick={() => setMobileOpen(false)} className="text-gold font-medium">
                  Admin
                </Link>
              </li>
            )}
            {user ? (
              <>
                <li>
                  <Link to="/account" onClick={() => setMobileOpen(false)} className="text-carbon/70 hover:text-gold transition-colors font-medium">
                    Mi Cuenta
                  </Link>
                </li>
                <li>
                  <button onClick={() => { signOut(); setMobileOpen(false); }} className="text-carbon/60 hover:text-gold transition-colors text-sm">
                    Cerrar Sesión
                  </button>
                </li>
              </>
            ) : (
              <li>
                <Link to="/login" onClick={() => setMobileOpen(false)} className="text-carbon/60 hover:text-gold transition-colors flex items-center gap-2">
                  <User size={18} />
                  <span>Iniciar Sesión</span>
                </Link>
              </li>
            )}
          </ul>
        </SheetContent>
      </Sheet>
    </header>
  );
};

export default Navbar;

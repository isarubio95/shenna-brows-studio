import { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import logo from "@/assets/logo-shenna.png";
import {
  ShoppingBag, User, Menu, Shield,
  Sparkles, Target, Scissors, Droplet, HeartHandshake,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
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

const navLinks: { label: string; to: string; icon: LucideIcon }[] = [
  { label: "Inicio", to: "/", icon: Sparkles },
  { label: "Pinzas", to: "/pinzas", icon: Target },
  { label: "Tijeras", to: "/tijeras", icon: Scissors },
  { label: "Gel", to: "/gel", icon: Droplet },
  { label: "Sobre mí", to: "/sobre-mi", icon: HeartHandshake },
];

const Navbar = () => {
  const [scrolled, setScrolled] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [lastScrollY, setLastScrollY] = useState(0);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { openCart, totalItems } = useCart();
  const { user, isAdmin, profile, signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const firstName = profile?.full_name?.split(" ")[0] || "";

  const scrollToTop = (e: React.MouseEvent) => {
    if (location.pathname === "/") {
      e.preventDefault();
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else {
      window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
    }
  };
  const isHome = location.pathname === "/";
  const isSolid = !isHome || scrolled;

  useEffect(() => {
    const onScroll = () => {
      const currentY = window.scrollY;
      setScrolled(currentY > 20);
      setHidden(currentY > lastScrollY && currentY > 60);
      setLastScrollY(currentY);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [lastScrollY]);

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  // Always dark text/icons since hero bg is light
  const linkColor = "text-carbon hover:text-gold";
  const iconColor = "text-carbon/70";

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ease-in-out ${
        hidden ? "-translate-y-full" : "translate-y-0"
      } ${
        isSolid
          ? "bg-cream/85 backdrop-blur-lg shadow-sm"
          : "bg-transparent"
      }`}
    >
      <nav className="container mx-auto flex items-center justify-between px-6 py-4 lg:py-5">
        <Link to="/" onClick={scrollToTop}>
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
                onClick={link.to === "/" ? scrollToTop : undefined}
                className={`text-sm font-medium tracking-wide transition-colors duration-300 hover:text-gold ${
                  location.pathname === link.to ? "text-gold font-semibold" : linkColor
                }`}
              >
                {link.label}
              </Link>
            </li>
          ))}
        </ul>

        {/* Right icons — visible on ALL screen sizes */}
        <div className="flex items-center gap-3 lg:gap-4">
          {isAdmin && (
            <Link
              to="/admin"
              className={`hidden lg:block transition-colors duration-300 hover:text-gold ${iconColor}`}
              aria-label="Admin"
            >
              <Shield size={20} />
            </Link>
          )}

          {/* User icon — visible on mobile + desktop */}
          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className={`flex flex-col items-center gap-0.5 transition-colors focus:outline-none hover:text-gold ${iconColor}`} aria-label="Mi cuenta">
                  <User size={20} fill="currentColor" />
                  {firstName && (
                    <span className={`hidden lg:block text-[10px] uppercase tracking-widest font-medium leading-none max-w-[60px] truncate ${iconColor}`}>
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
              className={`transition-colors duration-300 hover:text-gold ${iconColor}`}
              aria-label="Mi cuenta"
            >
              <User size={20} />
            </Link>
          )}

          {/* Cart — always visible */}
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

          {/* Hamburger — mobile only */}
          <button
            onClick={() => setMobileOpen(true)}
            className={`lg:hidden transition-colors duration-300 hover:text-gold text-carbon/70`}
            aria-label="Menú"
          >
            <Menu size={24} />
          </button>
        </div>
      </nav>

      {/* Mobile menu — Sheet from right */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="right" className="bg-cream border-l border-gold/10 w-72 flex flex-col">
          <SheetHeader className="text-left pl-1">
            <SheetTitle className="font-playfair text-gold text-lg">Menú</SheetTitle>
          </SheetHeader>

          <ul className="flex flex-col mt-6">
            {navLinks.map((link) => {
              const Icon = link.icon;
              const isActive = location.pathname === link.to;
              return (
                <li key={link.to} className="border-b border-gold/10 last:border-b-0">
                  <Link
                    to={link.to}
                    onClick={(e) => { if (link.to === "/") scrollToTop(e); setMobileOpen(false); }}
                    className={`flex w-full items-center justify-between py-4 px-1 transition-colors ${
                      isActive
                        ? "text-gold"
                        : "text-carbon hover:text-gold"
                    }`}
                  >
                    <span className="font-playfair text-lg tracking-wide">{link.label}</span>
                    <Icon size={20} className="text-gold/70" />
                  </Link>
                </li>
              );
            })}

            {isAdmin && (
              <li className="border-b border-gold/10">
                <Link
                  to="/admin"
                  onClick={() => setMobileOpen(false)}
                  className="flex w-full items-center justify-between py-4 px-1 text-gold font-playfair text-lg tracking-wide"
                >
                  <span>Admin</span>
                  <Shield size={20} className="text-gold/70" />
                </Link>
              </li>
            )}
          </ul>

          {/* Auth section at bottom */}
          <div className="mt-auto pb-6 pt-4 border-t border-gold/10">
            {user ? (
              <div className="flex flex-col gap-3 px-1">
                <Link
                  to="/account"
                  onClick={() => setMobileOpen(false)}
                  className="text-carbon hover:text-gold transition-colors font-medium text-sm"
                >
                  Mi Cuenta
                </Link>
                <button
                  onClick={() => { signOut(); setMobileOpen(false); }}
                  className="text-left text-carbon/50 hover:text-gold transition-colors text-sm"
                >
                  Cerrar Sesión
                </button>
              </div>
            ) : (
              <Link
                to="/login"
                onClick={() => setMobileOpen(false)}
                className="flex items-center gap-2 px-1 text-carbon/60 hover:text-gold transition-colors"
              >
                <User size={18} />
                <span className="text-sm">Iniciar Sesión</span>
              </Link>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </header>
  );
};

export default Navbar;

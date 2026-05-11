import { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import logo from "@/assets/logo-shenna.png";
import {
  ShoppingBag, User, Menu, Shield,
  Sparkles, HeartHandshake, Instagram,
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
  { label: "Tienda", to: "/tienda", icon: ShoppingBag },
  { label: "Conócenos", to: "/sobre-mi", icon: HeartHandshake },
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
  const displayName = firstName
    ? firstName.charAt(0).toUpperCase() + firstName.slice(1).toLowerCase()
    : "";

  const scrollToTop = (e: React.MouseEvent) => {
    if (location.pathname === "/") {
      e.preventDefault();
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else {
      window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
    }
  };

  const productPaths = new Set(["/espuma", "/pinzas", "/tijeras", "/stick", "/lapiz"]);
  const isTiendaActive = location.pathname === "/tienda" || productPaths.has(location.pathname);
  const isInicioActive = location.pathname === "/";
  const isLinkActive = (to: string) => {
    if (to === "/") return isInicioActive;
    if (to === "/tienda") return isTiendaActive;
    return location.pathname === to;
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

  // En barra transparente (hero): texto e iconos claros. En barra clara (scroll): oscuros.
  const linkColor = isSolid ? "text-carbon/90 hover:text-gold" : "text-white/90 hover:text-gold";
  const iconColor = isSolid ? "text-carbon/70 hover:text-gold" : "text-white/90 hover:text-gold";

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
      {/* Añadido "relative" al nav para que el centrado absoluto funcione correctamente */}
      <nav className="relative container mx-auto flex items-center justify-between px-6 py-4 lg:py-5">
        <Link to="/" onClick={scrollToTop}>
          <img
            src={logo}
            alt="Shenna Brows"
            className="h-11 lg:h-[3.35rem] w-auto relative z-10 drop-shadow-[0_2px_10px_rgba(201,162,39,0.22)] brightness-105 transition-all duration-300 hover:brightness-110 hover:scale-[1.02]"
          />
        </Link>

        <ul className="hidden lg:flex items-center gap-8 absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-max">
          {navLinks.map((link) => (
            <li key={link.to}>
              <Link
                to={link.to}
                onClick={link.to === "/" ? scrollToTop : undefined}
                className={`text-sm font-medium tracking-wide p-1 transition-colors duration-300 ${
                  isLinkActive(link.to) ? (isSolid ? "text-gold" : "text-amber-200") : linkColor
                }`}
              >
                {link.label}
              </Link>
            </li>
          ))}
        </ul>

        {/* Right icons — visible on ALL screen sizes */}
        <div className="flex items-center gap-3 lg:gap-4 relative z-10">
          <a
            href="https://www.instagram.com/shennabrows/"
            target="_blank"
            rel="noopener noreferrer"
            className={`hidden lg:flex p-1 transition-colors duration-300 ${iconColor}`}
            aria-label="Instagram"
          >
            <Instagram size={21} className="drop-shadow-sm" />
          </a>

          {isAdmin && (
            <Link
              to="/admin"
              className={`p-1 transition-colors duration-300 ${iconColor}`}
              aria-label="Admin"
            >
              <Shield size={21} className="drop-shadow-sm" />
            </Link>
          )}

          {/* User icon — visible on mobile + desktop */}
          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className={`group flex flex-col items-center p-1 gap-0.5 transition-colors focus:outline-none ${iconColor} hover:text-gold`} aria-label="Mi cuenta">
                  <User size={21} fill="currentColor" className="drop-shadow-sm transition-colors group-hover:text-gold" />
                  {displayName && (
                    <span className={`text-[10px] tracking-widest font-medium leading-none max-w-[60px] truncate transition-colors ${iconColor} group-hover:text-gold`}>
                      {displayName}
                    </span>
                  )}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48 bg-card border-border z-50">
                <DropdownMenuLabel className="font-playfair text-sm">
                  Hola, {displayName || "Cliente"}
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
              className={`transition-colors duration-300 ${iconColor}`}
              aria-label="Mi cuenta"
            >
              <User size={21} className="drop-shadow-sm" />
            </Link>
          )}

          {/* Cart — always visible */}
          <button
            onClick={openCart}
            className={`relative transition-colors p-1 duration-300 ${iconColor}`}
            aria-label="Carrito"
          >
            <ShoppingBag size={21} className="drop-shadow-sm" />
            {totalItems > 0 && (
              <span className="absolute -top-1.5 -right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-gold text-[10px] font-semibold text-white">
                {totalItems}
              </span>
            )}
          </button>

          {/* Hamburger — mobile only */}
          <button
            onClick={() => setMobileOpen(true)}
            className={`lg:hidden p-1 transition-colors duration-300 ${iconColor}`}
            aria-label="Menú"
          >
            <Menu size={25} />
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
              return (
                <li key={link.to} className="border-b border-gold/10 last:border-b-0">
                  <Link
                    to={link.to}
                    onClick={(e) => {
                      if (link.to === "/") scrollToTop(e);
                      setMobileOpen(false);
                    }}
                    className={`flex w-full items-center justify-between py-4 px-1 transition-colors ${
                      isLinkActive(link.to)
                        ? "text-gold"
                        : "text-carbon hover:text-gold"
                    }`}
                  >
                    <span className="font-playfair text-lg tracking-wide">{link.label}</span>
                    <Icon size={21} className="text-gold/70 drop-shadow-sm" />
                  </Link>
                </li>
              );
            })}      
          </ul>

          {/* Auth section at bottom */}
          <div className="mt-auto pb-6 pt-4 border-t border-gold/10">
            <div className="flex items-center gap-4 px-1 mb-5">
              <a
                href="https://www.instagram.com/shennabrows/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-carbon/70 hover:text-gold transition-colors"
                aria-label="Instagram"
              >
                <Instagram size={21} />
              </a>
            </div>

            {user ? (
              <div className="flex flex-col gap-3 px-1">
                {displayName && (
                  <p className="text-carbon/80 font-playfair text-sm mb-1">
                    Hola, {displayName}
                  </p>
                )}
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
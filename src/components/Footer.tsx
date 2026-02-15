import { Link } from "react-router-dom";
import { Instagram, Mail } from "lucide-react";
import logo from "@/assets/logo-shenna.png";

const Footer = () => (
  <footer className="bg-carbon text-cream/80 border-t border-gold/30">
    <div className="container mx-auto px-6 py-16">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
        {/* Brand */}
        <div>
          <Link to="/"><img src={logo} alt="Shenna Brows" className="h-12 w-auto mb-4 brightness-0 invert" /></Link>
          <p className="text-sm leading-relaxed text-cream/60 max-w-xs">
            Herramientas profesionales de cejas con acero inoxidable italiano. Precisión creada desde la experiencia.
          </p>
        </div>

        {/* Links */}
        <div>
          <h4 className="font-semibold text-cream text-sm uppercase tracking-widest mb-4">Navegación</h4>
          <ul className="space-y-3 text-sm">
            {[
              { label: "Inicio", to: "/" },
              { label: "Pinzas", to: "/pinzas" },
              { label: "Tijeras", to: "/tijeras" },
              { label: "Gel", to: "/gel" },
              { label: "Sobre mí", to: "/sobre-mi" },
            ].map((l) => (
              <li key={l.to}>
                <Link to={l.to} className="hover:text-gold transition-colors">
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        {/* Contact */}
        <div>
          <h4 className="font-semibold text-cream text-sm uppercase tracking-widest mb-4">Contacto</h4>
          <div className="flex gap-4 mb-4">
            <a href="#" className="hover:text-gold transition-colors" aria-label="Instagram">
              <Instagram size={20} />
            </a>
            <a href="#" className="hover:text-gold transition-colors" aria-label="Email">
              <Mail size={20} />
            </a>
          </div>
          <p className="text-sm text-cream/50">info@shennabrows.com</p>
        </div>
      </div>

      <div className="border-t border-cream/10 mt-12 pt-8 text-center text-xs text-cream/40">
        © {new Date().getFullYear()} Shenna BROWS. Todos los derechos reservados.
      </div>
    </div>
  </footer>
);

export default Footer;

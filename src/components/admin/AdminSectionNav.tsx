import { cn } from "@/lib/utils";
import {
  FileText,
  Mail,
  Megaphone,
  Package,
  ShoppingBag,
  type LucideIcon,
} from "lucide-react";

export type AdminSection = "pedidos" | "catalogo" | "correos" | "newsletter" | "contenido";

const SECTIONS: { id: AdminSection; label: string; icon: LucideIcon }[] = [
  { id: "pedidos", label: "Pedidos", icon: ShoppingBag },
  { id: "catalogo", label: "Catálogo", icon: Package },
  { id: "correos", label: "Correos", icon: Mail },
  { id: "newsletter", label: "Newsletter", icon: Megaphone },
  { id: "contenido", label: "Contenido", icon: FileText },
];

const SECTION_DESCRIPTIONS: Record<AdminSection, string> = {
  pedidos: "Gestiona pedidos recientes y devoluciones.",
  catalogo: "Controla stock y productos del catálogo.",
  correos: "Envía correos individuales a clientes.",
  newsletter: "Campañas a suscriptores con consentimiento activo.",
  contenido: "Textos de la web, tema visual y testimonios.",
};

type AdminSectionNavProps = {
  active: AdminSection;
  onChange: (section: AdminSection) => void;
};

export function getAdminSectionDescription(section: AdminSection): string {
  return SECTION_DESCRIPTIONS[section];
}

const AdminSectionNav = ({ active, onChange }: AdminSectionNavProps) => (
  <nav
    className="flex flex-wrap gap-2 mb-8"
    aria-label="Secciones del panel de administración"
  >
    {SECTIONS.map(({ id, label, icon: Icon }) => {
      const isActive = active === id;
      return (
        <button
          key={id}
          type="button"
          onClick={() => onChange(id)}
          aria-current={isActive ? "page" : undefined}
          className={cn(
            "inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-all",
            "border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/40 focus-visible:ring-offset-2 focus-visible:ring-offset-cream",
            isActive
              ? "border-gold bg-gold text-white shadow-[0_4px_14px_rgba(197,160,89,0.35)]"
              : "border-gold/15 bg-white text-carbon/65 hover:border-gold/30 hover:text-carbon hover:bg-gold/[0.04]",
          )}
        >
          <Icon className="h-4 w-4 shrink-0" aria-hidden />
          {label}
        </button>
      );
    })}
  </nav>
);

export default AdminSectionNav;

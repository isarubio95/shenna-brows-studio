import { useState } from "react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import {
  ArrowLeft,
  FileText,
  Mail,
  Megaphone,
  Menu,
  MessageSquareQuote,
  Package,
  RotateCcw,
  ShoppingBag,
  Ticket,
  type LucideIcon,
} from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

export type AdminSection =
  | "pedidos"
  | "devoluciones"
  | "catalogo"
  | "correos"
  | "newsletter"
  | "codigos_dto"
  | "contenido"
  | "testimonios";

const SECTIONS: { id: AdminSection; label: string; icon: LucideIcon }[] = [
  { id: "pedidos", label: "Pedidos", icon: ShoppingBag },
  { id: "devoluciones", label: "Devoluciones", icon: RotateCcw },
  { id: "catalogo", label: "Catálogo", icon: Package },
  { id: "correos", label: "Correos", icon: Mail },
  { id: "newsletter", label: "Newsletter", icon: Megaphone },
  { id: "codigos_dto", label: "Códigos dto.", icon: Ticket },
  { id: "contenido", label: "Contenido", icon: FileText },
  { id: "testimonios", label: "Testimonios", icon: MessageSquareQuote },
];

const SECTION_DESCRIPTIONS: Record<AdminSection, string> = {
  pedidos: "Gestiona pedidos.",
  devoluciones: "Gestiona solicitudes de devolución y reembolsos.",
  catalogo: "Controla stock y productos del catálogo.",
  correos: "Envía correos individuales a clientes.",
  newsletter: "Campañas a suscriptores con consentimiento activo.",
  codigos_dto: "Crea y gestiona códigos promocionales y sus usos.",
  contenido: "Textos de la web y tema visual.",
  testimonios: "Modera y destaca testimonios de clientes.",
};

type AdminSectionNavProps = {
  active: AdminSection;
  onChange: (section: AdminSection) => void;
};

export function getAdminSectionDescription(section: AdminSection): string {
  return SECTION_DESCRIPTIONS[section];
}

function NavItems({
  active,
  onChange,
  onNavigate,
}: {
  active: AdminSection;
  onChange: (section: AdminSection) => void;
  onNavigate?: () => void;
}) {
  return (
    <ul className="flex flex-col gap-1">
      {SECTIONS.map(({ id, label, icon: Icon }) => {
        const isActive = active === id;
        return (
          <li key={id}>
            <button
              type="button"
              onClick={() => {
                onChange(id);
                onNavigate?.();
              }}
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/40",
                isActive
                  ? "bg-gold text-white shadow-[0_4px_14px_rgba(197,160,89,0.28)]"
                  : "text-carbon/65 hover:bg-gold/8 hover:text-carbon",
              )}
            >
              <Icon className="h-4 w-4 shrink-0" aria-hidden />
              {label}
            </button>
          </li>
        );
      })}
    </ul>
  );
}

function SidebarBrand() {
  return (
    <div className="mb-8">
      <p className="font-playfair text-xl font-bold text-carbon leading-tight">
        Administración
      </p>
      <p className="text-xs text-carbon/40 mt-1">Shenna Brows Studio</p>
    </div>
  );
}

function SidebarFooter() {
  return (
    <div className="mt-auto pt-6 border-t border-gold/10">
      <Link
        to="/"
        className="inline-flex items-center gap-2 text-sm text-carbon/50 hover:text-carbon transition-colors"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden />
        Volver a la web
      </Link>
    </div>
  );
}

const AdminSectionNav = ({ active, onChange }: AdminSectionNavProps) => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const activeLabel = SECTIONS.find((s) => s.id === active)?.label ?? "";

  return (
    <>
      {/* Desktop sidebar */}
      <aside
        className="hidden lg:flex fixed inset-y-0 left-0 z-40 w-60 flex-col border-r border-gold/10 bg-white/90 backdrop-blur-sm px-4 py-6"
        aria-label="Secciones del panel de administración"
      >
        <SidebarBrand />
        <nav className="flex-1 overflow-y-auto">
          <NavItems active={active} onChange={onChange} />
        </nav>
        <SidebarFooter />
      </aside>

      {/* Mobile top bar + sheet */}
      <div className="lg:hidden sticky top-0 z-40 border-b border-gold/10 bg-cream/95 backdrop-blur-sm">
        <div className="flex items-center gap-3 px-4 py-3">
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-gold/15 bg-white text-carbon hover:border-gold/30 transition-colors"
            aria-label="Abrir menú de administración"
          >
            <Menu className="h-5 w-5" />
          </button>
          <div className="min-w-0">
            <p className="font-playfair text-base font-semibold text-carbon truncate">
              {activeLabel}
            </p>
            <p className="text-xs text-carbon/40 truncate">Panel de administración</p>
          </div>
        </div>
      </div>

      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="w-[min(100%,18rem)] bg-cream p-0 border-gold/10">
          <SheetHeader className="sr-only">
            <SheetTitle>Menú de administración</SheetTitle>
          </SheetHeader>
          <div className="flex h-full flex-col px-4 py-6">
            <SidebarBrand />
            <nav className="flex-1 overflow-y-auto" aria-label="Secciones del panel de administración">
              <NavItems
                active={active}
                onChange={onChange}
                onNavigate={() => setMobileOpen(false)}
              />
            </nav>
            <SidebarFooter />
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
};

export default AdminSectionNav;

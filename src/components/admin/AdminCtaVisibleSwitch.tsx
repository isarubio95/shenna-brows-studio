import { useId } from "react";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

interface AdminCtaVisibleSwitchProps {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  /** Por defecto «Mostrar botón». */
  label?: string;
}

/** Interruptor común para enseñar u ocultar el botón de una sección. */
const AdminCtaVisibleSwitch = ({
  checked,
  onCheckedChange,
  label = "Mostrar botón",
}: AdminCtaVisibleSwitchProps) => {
  const id = useId();
  return (
    <div className="flex items-center justify-between gap-4 rounded-lg border border-gold/15 bg-cream/40 px-4 py-3">
      <div>
        <Label htmlFor={id} className="text-sm text-carbon cursor-pointer">
          {label}
        </Label>
        <p className="text-xs text-carbon/40">
          {checked
            ? "Si lo apagas, la sección se ve sin el botón."
            : "Oculto: la sección se ve sin el botón. Sus textos y ajustes se guardan."}
        </p>
      </div>
      <Switch id={id} checked={checked} onCheckedChange={onCheckedChange} />
    </div>
  );
};

export default AdminCtaVisibleSwitch;

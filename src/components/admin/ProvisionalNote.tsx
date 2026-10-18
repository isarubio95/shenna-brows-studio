import { AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

/** Aviso ámbar junto a un texto provisional, igual que las respuestas pendientes del FAQ. */
const ProvisionalNote = ({
  children = "Texto provisional: cámbialo por el definitivo.",
  className,
}: {
  children?: React.ReactNode;
  className?: string;
}) => (
  <p
    className={cn(
      "mt-1.5 inline-flex items-start gap-1.5 rounded-md border border-amber-200 bg-amber-50 px-2.5 py-1.5 text-xs leading-snug text-amber-800",
      className,
    )}
  >
    <AlertTriangle className="mt-px h-3.5 w-3.5 shrink-0" aria-hidden />
    <span>{children}</span>
  </p>
);

export default ProvisionalNote;

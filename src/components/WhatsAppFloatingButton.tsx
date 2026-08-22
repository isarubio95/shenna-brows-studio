import { WhatsAppIcon } from "@/components/icons/WhatsAppIcon";
import { useWhatsAppButton } from "@/hooks/use-whatsapp-button";
import {
  buildWhatsAppHref,
  DEFAULT_WHATSAPP_BUTTON,
  type WhatsAppButtonConfig,
} from "@/lib/whatsapp-content";
import { cn } from "@/lib/utils";

type WhatsAppButtonViewProps = {
  config: WhatsAppButtonConfig;
  className?: string;
  /** En el panel de admin evita abrir WhatsApp al pulsar la vista previa. */
  preview?: boolean;
};

/** Botón circular de WhatsApp (también usado en la vista previa del admin). */
export function WhatsAppButtonView({ config, className, preview }: WhatsAppButtonViewProps) {
  const href = buildWhatsAppHref(config);
  const background = config.background || DEFAULT_WHATSAPP_BUTTON.background;
  const iconColor = config.iconColor || DEFAULT_WHATSAPP_BUTTON.iconColor;

  return (
    <a
      href={preview ? undefined : href}
      target={preview ? undefined : "_blank"}
      rel={preview ? undefined : "noopener noreferrer"}
      aria-label="Contactar por WhatsApp"
      aria-disabled={preview || undefined}
      onClick={preview ? (event) => event.preventDefault() : undefined}
      className={cn(
        "flex h-14 w-14 items-center justify-center rounded-full border border-white/70 shadow-md transition hover:scale-105 hover:brightness-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E9808E] focus-visible:ring-offset-2",
        preview && "pointer-events-none",
        className,
      )}
      style={{
        background: `linear-gradient(90deg, ${background} 0%, color-mix(in srgb, ${background} 65%, white) 50%, ${background} 100%)`,
        color: iconColor,
      }}
    >
      <WhatsAppIcon className="h-7 w-7" />
    </a>
  );
}

const WhatsAppFloatingButton = () => {
  const config = useWhatsAppButton();
  if (!config.enabled) return null;

  return (
    <WhatsAppButtonView
      config={config}
      className="fixed bottom-6 right-6 z-40"
    />
  );
};

export default WhatsAppFloatingButton;

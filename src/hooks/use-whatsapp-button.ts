import { useMemo } from "react";
import { useSiteContentValue } from "@/hooks/use-site-content";
import { parseWhatsAppButtonConfig, type WhatsAppButtonConfig } from "@/lib/whatsapp-content";

export function useWhatsAppButton(): WhatsAppButtonConfig {
  const content = useSiteContentValue("whatsapp_button");
  return useMemo(() => parseWhatsAppButtonConfig(content), [content]);
}

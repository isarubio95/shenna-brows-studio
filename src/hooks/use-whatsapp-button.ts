import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  DEFAULT_WHATSAPP_BUTTON,
  parseWhatsAppButtonConfig,
  type WhatsAppButtonConfig,
} from "@/lib/whatsapp-content";

let cached: WhatsAppButtonConfig | null = null;
let inflight: Promise<WhatsAppButtonConfig> | null = null;

function loadWhatsAppButton(): Promise<WhatsAppButtonConfig> {
  if (cached) return Promise.resolve(cached);
  if (!inflight) {
    inflight = (supabase as any)
      .from("site_content")
      .select("content")
      .eq("key", "whatsapp_button")
      .maybeSingle()
      .then(({ data }: { data: { content?: string | null } | null }) => {
        cached = parseWhatsAppButtonConfig(data?.content);
        return cached;
      })
      .catch(() => cached ?? DEFAULT_WHATSAPP_BUTTON)
      .finally(() => {
        inflight = null;
      });
  }
  return inflight;
}

export function useWhatsAppButton(): WhatsAppButtonConfig {
  const [config, setConfig] = useState<WhatsAppButtonConfig>(cached ?? DEFAULT_WHATSAPP_BUTTON);

  useEffect(() => {
    let cancelled = false;
    loadWhatsAppButton().then((next) => {
      if (!cancelled) setConfig(next);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return config;
}

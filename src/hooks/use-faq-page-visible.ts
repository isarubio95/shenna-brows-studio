import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { DEFAULT_FAQ, FAQ_CONTENT_KEY, parseFaqConfig } from "@/lib/faq-content";

let cached: boolean | null = null;
let inflight: Promise<boolean> | null = null;

function loadFaqPageVisible(): Promise<boolean> {
  if (cached !== null) return Promise.resolve(cached);
  if (!inflight) {
    inflight = (supabase as any)
      .from("site_content")
      .select("content")
      .eq("key", FAQ_CONTENT_KEY)
      .maybeSingle()
      .then(({ data }: { data: { content?: string | null } | null }) => {
        cached = parseFaqConfig(data?.content).pageVisible;
        return cached;
      })
      .catch(() => cached ?? DEFAULT_FAQ.pageVisible)
      .finally(() => {
        inflight = null;
      });
  }
  return inflight;
}

export function invalidateFaqPageVisibleCache() {
  cached = null;
}

export function useFaqPageVisible(): boolean {
  const [visible, setVisible] = useState(cached ?? DEFAULT_FAQ.pageVisible);

  useEffect(() => {
    let cancelled = false;
    loadFaqPageVisible().then((next) => {
      if (!cancelled) setVisible(next);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return visible;
}

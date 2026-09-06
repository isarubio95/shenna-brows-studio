import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  ANNOUNCEMENT_CONTENT_KEY,
  DEFAULT_ANNOUNCEMENT_BAR,
  parseAnnouncementBarConfig,
  type AnnouncementBarConfig,
} from "@/lib/announcement-content";

let cached: AnnouncementBarConfig | null = null;
let inflight: Promise<AnnouncementBarConfig> | null = null;

function loadAnnouncementBar(): Promise<AnnouncementBarConfig> {
  if (cached) return Promise.resolve(cached);
  if (!inflight) {
    inflight = (supabase as any)
      .from("site_content")
      .select("content")
      .eq("key", ANNOUNCEMENT_CONTENT_KEY)
      .maybeSingle()
      .then(({ data }: { data: { content?: string | null } | null }) => {
        cached = parseAnnouncementBarConfig(data?.content);
        return cached;
      })
      .catch(() => cached ?? DEFAULT_ANNOUNCEMENT_BAR)
      .finally(() => {
        inflight = null;
      });
  }
  return inflight;
}

export function invalidateAnnouncementBarCache() {
  cached = null;
}

export function useAnnouncementBar(): AnnouncementBarConfig {
  const [config, setConfig] = useState<AnnouncementBarConfig>(
    cached ?? DEFAULT_ANNOUNCEMENT_BAR,
  );

  useEffect(() => {
    let cancelled = false;
    loadAnnouncementBar().then((next) => {
      if (!cancelled) setConfig(next);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return config;
}

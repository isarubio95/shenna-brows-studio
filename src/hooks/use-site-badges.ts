import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  DEFAULT_SITE_BADGES,
  parseSiteBadgesConfig,
  type SiteBadgesConfig,
} from "@/lib/badges-content";

let cached: SiteBadgesConfig | null = null;
let inflight: Promise<SiteBadgesConfig> | null = null;

function loadSiteBadges(): Promise<SiteBadgesConfig> {
  if (cached) return Promise.resolve(cached);
  if (!inflight) {
    inflight = (supabase as any)
      .from("site_content")
      .select("content")
      .eq("key", "site_badges")
      .maybeSingle()
      .then(({ data }: { data: { content?: string | null } | null }) => {
        cached = parseSiteBadgesConfig(data?.content);
        return cached;
      })
      .catch(() => cached ?? DEFAULT_SITE_BADGES)
      .finally(() => {
        inflight = null;
      });
  }
  return inflight;
}

export function useSiteBadges(): SiteBadgesConfig {
  const [config, setConfig] = useState<SiteBadgesConfig>(cached ?? DEFAULT_SITE_BADGES);

  useEffect(() => {
    let cancelled = false;
    loadSiteBadges().then((next) => {
      if (!cancelled) setConfig(next);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return config;
}

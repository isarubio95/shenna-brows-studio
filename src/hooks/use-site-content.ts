import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

interface SiteContent {
  key: string;
  title: string;
  content: string;
}

/** Misma clave que el script de preload del hero en index.html. */
export const SITE_CONTENT_CACHE_KEY = "shenna.site-content.v1";

let memory: Record<string, SiteContent> | null = null;

function isSiteContent(value: unknown): value is SiteContent {
  if (!value || typeof value !== "object") return false;
  const row = value as SiteContent;
  return (
    typeof row.key === "string" &&
    typeof row.title === "string" &&
    typeof row.content === "string"
  );
}

function readCache(): Record<string, SiteContent> {
  if (memory) return memory;
  memory = {};
  if (typeof window === "undefined") return memory;
  try {
    const raw = window.localStorage.getItem(SITE_CONTENT_CACHE_KEY);
    if (!raw) return memory;
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object") return memory;
    for (const [key, value] of Object.entries(parsed)) {
      if (isSiteContent(value) && value.key === key) memory[key] = value;
    }
  } catch {
    memory = {};
  }
  return memory;
}

function pickCached(keys: string[]): Record<string, SiteContent> {
  const all = readCache();
  const picked: Record<string, SiteContent> = {};
  for (const key of keys) {
    const row = all[key];
    if (row) picked[key] = row;
  }
  return picked;
}

function commitCache(patch: Record<string, SiteContent>, requested: string[]) {
  const all = readCache();
  for (const key of requested) {
    if (patch[key]) all[key] = patch[key];
    else delete all[key];
  }
  memory = all;
  try {
    window.localStorage.setItem(SITE_CONTENT_CACHE_KEY, JSON.stringify(all));
  } catch {
    /* cuota o modo privado: la sesión sigue en memoria */
  }
}

export function useSiteContent(keys: string[]) {
  const keysKey = keys.join("\0");
  const [data, setData] = useState<Record<string, SiteContent>>(() => pickCached(keys));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const requested = keysKey.split("\0").filter(Boolean);
    let cancelled = false;

    (supabase as any)
      .from("site_content")
      .select("key, title, content")
      .in("key", requested)
      .then(({ data: rows, error }: { data: SiteContent[] | null; error: unknown }) => {
        if (cancelled) return;
        if (error) {
          setLoading(false);
          return;
        }
        const map: Record<string, SiteContent> = {};
        rows?.forEach((row) => {
          if (isSiteContent(row)) map[row.key] = row;
        });
        commitCache(map, requested);
        setData(map);
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [keysKey]);

  return { data, loading };
}

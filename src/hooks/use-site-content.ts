import { useEffect, useMemo, useSyncExternalStore } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface SiteContent {
  key: string;
  title: string;
  content: string;
}

type SiteContentMap = Record<string, SiteContent>;

/** Misma clave que el script de precarga de index.html. */
export const SITE_CONTENT_CACHE_KEY = "shenna.site-content.v1";

/**
 * Espera antes del primer render (ver `waitForSiteContent`). Con caché hay algo
 * que pintar ya, así que se espera menos; sin ella, pintar los valores por
 * defecto y luego cambiarlos es justo el parpadeo que se quiere evitar.
 */
const BOOT_WAIT_WITH_CACHE_MS = 1000;
const BOOT_WAIT_WITHOUT_CACHE_MS = 3000;
/** Al montar una página se revalida si los datos tienen más de esto. */
const REVALIDATE_AFTER_MS = 60_000;

declare global {
  interface Window {
    /** Petición lanzada en index.html antes de que cargue el bundle. */
    __siteContentPrefetch?: Promise<unknown>;
  }
}

interface State {
  rows: SiteContentMap;
  /** Ya terminó al menos una petición (bien o mal) en esta carga de página. */
  settled: boolean;
}

let state: State = { rows: readCache(), settled: false };
let fetchedAt = 0;
let inflight: Promise<void> | null = null;
const listeners = new Set<() => void>();

function isSiteContent(value: unknown): value is SiteContent {
  if (!value || typeof value !== "object") return false;
  const row = value as SiteContent;
  return (
    typeof row.key === "string" &&
    typeof row.title === "string" &&
    typeof row.content === "string"
  );
}

function toMap(rows: unknown): SiteContentMap {
  const map: SiteContentMap = {};
  if (!Array.isArray(rows)) return map;
  for (const row of rows) {
    if (isSiteContent(row)) map[row.key] = row;
  }
  return map;
}

function readCache(): SiteContentMap {
  const map: SiteContentMap = {};
  if (typeof window === "undefined") return map;
  try {
    const raw = window.localStorage.getItem(SITE_CONTENT_CACHE_KEY);
    if (!raw) return map;
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object") return map;
    for (const [key, value] of Object.entries(parsed)) {
      if (isSiteContent(value) && value.key === key) map[key] = value;
    }
  } catch {
    /* caché corrupta o inaccesible: se parte de vacío */
  }
  return map;
}

function sameRows(a: SiteContentMap, b: SiteContentMap) {
  const keys = Object.keys(a);
  if (keys.length !== Object.keys(b).length) return false;
  return keys.every(
    (key) => b[key] && a[key].title === b[key].title && a[key].content === b[key].content,
  );
}

function setState(next: State) {
  state = next;
  listeners.forEach((listener) => listener());
}

function commit(rows: SiteContentMap) {
  fetchedAt = Date.now();
  // Si nada cambió se conserva el objeto: los consumidores no se re-renderizan.
  setState({ rows: sameRows(state.rows, rows) ? state.rows : rows, settled: true });
  try {
    window.localStorage.setItem(SITE_CONTENT_CACHE_KEY, JSON.stringify(rows));
  } catch {
    /* cuota o modo privado: la sesión sigue en memoria */
  }
}

async function fetchRows(): Promise<SiteContentMap> {
  const prefetch = window.__siteContentPrefetch;
  if (prefetch) {
    window.__siteContentPrefetch = undefined;
    try {
      return toMap(await prefetch);
    } catch {
      /* la precarga falló: se reintenta con el cliente */
    }
  }
  const { data, error } = await (supabase as any)
    .from("site_content")
    .select("key, title, content");
  if (error) throw error;
  return toMap(data);
}

/** Pide todo `site_content` de una vez (deduplicado). Nunca rechaza. */
export function refreshSiteContent(): Promise<void> {
  if (!inflight) {
    inflight = fetchRows()
      .then(commit, () => {
        if (!state.settled) setState({ ...state, settled: true });
      })
      .finally(() => {
        inflight = null;
      });
  }
  return inflight;
}

/** Tras guardar en el panel: la próxima página que se monte trae datos nuevos. */
export function invalidateSiteContent() {
  fetchedAt = 0;
  void refreshSiteContent();
}

/**
 * Para `main.tsx`: resuelve cuando llegan los datos o vence la espera, lo que
 * pase antes. Así el primer render ya pinta el contenido guardado en la admin.
 */
export function waitForSiteContent(): Promise<void> {
  const hasCache = Object.keys(state.rows).length > 0;
  const timeout = hasCache ? BOOT_WAIT_WITH_CACHE_MS : BOOT_WAIT_WITHOUT_CACHE_MS;
  return Promise.race([
    refreshSiteContent(),
    new Promise<void>((resolve) => window.setTimeout(resolve, timeout)),
  ]);
}

/** Lectura síncrona, para código que corre fuera de React. */
export function getSiteContent(key: string): SiteContent | undefined {
  return state.rows[key];
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

const getSnapshot = () => state;

export function useSiteContent(keys: string[]) {
  const keysKey = keys.join("\0");
  const { rows, settled } = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  useEffect(() => {
    if (!inflight && Date.now() - fetchedAt > REVALIDATE_AFTER_MS) void refreshSiteContent();
  }, [keysKey]);

  const data = useMemo(() => {
    const picked: SiteContentMap = {};
    for (const key of keysKey.split("\0")) {
      if (key && rows[key]) picked[key] = rows[key];
    }
    return picked;
  }, [rows, keysKey]);

  return { data, loading: !settled };
}

/** `content` de una sola clave (o `undefined` si no existe). */
export function useSiteContentValue(key: string): string | undefined {
  return useSiteContent([key]).data[key]?.content;
}

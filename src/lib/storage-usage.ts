import { parseCampaignConfig } from "@/lib/campaign-content";
import { parseHeroConfig } from "@/lib/hero-content";
import { isVideoMediaUrl, posterPathForVideoPath, posterUrlForVideoUrl } from "@/lib/media-url";
import { parseProductFeatureVideos } from "@/lib/product-feature-videos";
import { parseProductImages } from "@/lib/product-images";
import { parseTiendaHeroConfig } from "@/lib/tienda-hero-content";
import { parseIndexVideoConfig } from "@/lib/video-content";
import { parseWelcomePopupConfig } from "@/lib/welcome-popup-content";

export const ADMIN_STORAGE_USAGE_QUERY_KEY = ["admin-storage-usage"] as const;

export const MEDIA_SITE_CONTENT_KEYS = [
  "index_hero",
  "index_campaign",
  "tienda_hero",
  "index_welcome_popup",
  "index_video",
] as const;

const PUBLIC_OBJECT_RE = /\/storage\/v1\/object\/public\/([^/]+)\/(.+)$/;

export type StorageObjectRef = {
  bucket: string;
  path: string;
};

export type UsedStorageRef = StorageObjectRef & {
  label: string;
};

export type ProductMediaSource = {
  name: string;
  image_url: string | null;
  feature_videos: unknown;
};

export type SiteContentSource = {
  key: string;
  content: string | null;
};

export function storageObjectKey(bucket: string, path: string): string {
  return `${bucket}/${path}`;
}

function splitUrlSuffix(url: string): [string, string] {
  const index = url.search(/[?#]/);
  if (index === -1) return [url, ""];
  return [url.slice(0, index), url.slice(index)];
}

/** Extrae bucket y path de una URL pública de Storage; ignora estáticos y query. */
export function parsePublicStorageRef(url: string | null | undefined): StorageObjectRef | null {
  const trimmed = (url ?? "").trim();
  if (!trimmed) return null;
  const [base] = splitUrlSuffix(trimmed);
  try {
    const pathname = base.startsWith("/") ? base : new URL(base).pathname;
    const match = pathname.match(PUBLIC_OBJECT_RE);
    if (!match) return null;
    const bucket = decodeURIComponent(match[1]);
    const path = decodeURIComponent(match[2]);
    if (!bucket || !path) return null;
    return { bucket, path };
  } catch {
    return null;
  }
}

function pushRef(out: UsedStorageRef[], url: string | null | undefined, label: string) {
  const ref = parsePublicStorageRef(url);
  if (!ref) return;
  out.push({ ...ref, label });
  if (!isVideoMediaUrl(url)) return;
  const posterRef = parsePublicStorageRef(posterUrlForVideoUrl(url));
  if (posterRef) out.push({ ...posterRef, label: `Póster: ${label}` });
}

export function collectUsedStorageRefs(input: {
  products: ProductMediaSource[];
  siteContent: SiteContentSource[];
}): UsedStorageRef[] {
  const out: UsedStorageRef[] = [];

  for (const product of input.products) {
    const label = `Producto: ${product.name}`;
    for (const url of parseProductImages(product.image_url)) {
      pushRef(out, url, label);
    }
    for (const video of parseProductFeatureVideos(product.feature_videos)) {
      pushRef(out, video.videoUrl, `${label} (vídeo)`);
    }
  }

  for (const row of input.siteContent) {
    switch (row.key) {
      case "index_hero": {
        const cfg = parseHeroConfig(row.content);
        pushRef(out, cfg.desktopImageUrl, "Hero escritorio");
        pushRef(out, cfg.mobileImageUrl, "Hero móvil");
        break;
      }
      case "index_campaign": {
        const cfg = parseCampaignConfig(row.content);
        pushRef(out, cfg.desktopImageUrl, "Campaña escritorio");
        pushRef(out, cfg.mobileImageUrl, "Campaña móvil");
        break;
      }
      case "tienda_hero": {
        const cfg = parseTiendaHeroConfig(row.content);
        pushRef(out, cfg.desktopImageUrl, "Tienda escritorio");
        pushRef(out, cfg.mobileImageUrl, "Tienda móvil");
        break;
      }
      case "index_welcome_popup": {
        const cfg = parseWelcomePopupConfig(row.content);
        pushRef(out, cfg.imageUrl, "Popup bienvenida");
        break;
      }
      case "index_video": {
        const cfg = parseIndexVideoConfig(row.content);
        pushRef(out, cfg.videoUrl, "Vídeo inicio");
        pushRef(out, cfg.posterUrl, "Póster vídeo inicio");
        break;
      }
      default:
        break;
    }
  }

  return out;
}

export function usedStorageLabelsByKey(refs: UsedStorageRef[]): Map<string, string[]> {
  const map = new Map<string, string[]>();
  for (const ref of refs) {
    const key = storageObjectKey(ref.bucket, ref.path);
    const existing = map.get(key);
    if (existing) {
      if (!existing.includes(ref.label)) existing.push(ref.label);
    } else {
      map.set(key, [ref.label]);
    }
  }
  return map;
}

export function posterCompanionPath(path: string): string | null {
  if (!isVideoMediaUrl(path)) return null;
  return posterPathForVideoPath(path);
}

export function formatStorageBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 B";
  if (bytes < 1024) return `${Math.round(bytes)} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  if (bytes < 1024 * 1024 * 1024) {
    const mb = bytes / (1024 * 1024);
    return mb >= 10 ? `${mb.toFixed(0)} MB` : `${mb.toFixed(1)} MB`;
  }
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

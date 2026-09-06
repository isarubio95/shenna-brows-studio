export const ANNOUNCEMENT_CONTENT_KEY = "announcement_bar";
export const ANNOUNCEMENT_BAR_HEIGHT_PX = 36;

export interface AnnouncementBarConfig {
  enabled: boolean;
  items: string[];
  background: string;
  textColor: string;
}

export const DEFAULT_ANNOUNCEMENT_ITEMS = [
  "Envíos gratis en pedidos superiores a 50 euros",
];

export const DEFAULT_ANNOUNCEMENT_BAR: AnnouncementBarConfig = {
  enabled: true,
  items: [...DEFAULT_ANNOUNCEMENT_ITEMS],
  background: "#000000",
  textColor: "#FFFFFF",
};

const HEX_RE = /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6}|[0-9A-Fa-f]{8})$/;

const isHexColor = (value: unknown): value is string =>
  typeof value === "string" && HEX_RE.test(value.trim());

const parseItems = (value: unknown): string[] => {
  if (Array.isArray(value)) {
    const items = value.map((item) => String(item).trim()).filter(Boolean);
    return items.length > 0 ? items : [...DEFAULT_ANNOUNCEMENT_ITEMS];
  }
  if (typeof value === "string") {
    const items = value
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);
    return items.length > 0 ? items : [...DEFAULT_ANNOUNCEMENT_ITEMS];
  }
  return [...DEFAULT_ANNOUNCEMENT_ITEMS];
};

export function parseAnnouncementBarConfig(raw?: string | null): AnnouncementBarConfig {
  if (!raw?.trim()) {
    return { ...DEFAULT_ANNOUNCEMENT_BAR, items: [...DEFAULT_ANNOUNCEMENT_ITEMS] };
  }

  const trimmed = raw.trim();
  if (!trimmed.startsWith("{")) {
    return {
      ...DEFAULT_ANNOUNCEMENT_BAR,
      items: parseItems(trimmed),
    };
  }

  try {
    const parsed = JSON.parse(trimmed) as Partial<AnnouncementBarConfig>;
    return {
      enabled: typeof parsed.enabled === "boolean" ? parsed.enabled : DEFAULT_ANNOUNCEMENT_BAR.enabled,
      items: parseItems(parsed.items),
      background: isHexColor(parsed.background)
        ? parsed.background.trim()
        : DEFAULT_ANNOUNCEMENT_BAR.background,
      textColor: isHexColor(parsed.textColor)
        ? parsed.textColor.trim()
        : DEFAULT_ANNOUNCEMENT_BAR.textColor,
    };
  } catch {
    return { ...DEFAULT_ANNOUNCEMENT_BAR, items: [...DEFAULT_ANNOUNCEMENT_ITEMS] };
  }
}

export function serializeAnnouncementBarConfig(config: AnnouncementBarConfig): string {
  const items = config.items.map((item) => item.trim()).filter(Boolean);
  return JSON.stringify({
    enabled: Boolean(config.enabled),
    items: items.length > 0 ? items : [...DEFAULT_ANNOUNCEMENT_ITEMS],
    background: config.background,
    textColor: config.textColor,
  });
}

export function announcementItemsToText(items: string[]): string {
  return items.join("\n");
}

export function announcementTextToItems(text: string): string[] {
  return parseItems(text);
}

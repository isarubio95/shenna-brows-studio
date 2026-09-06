import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface ThemeConfig {
  // Section backgrounds
  sectionProductsBg: string;
  sectionVideoBg: string;
  sectionBrandStoryBg: string;
  sectionCeoBg: string;
  sectionTestimonialsBg: string;
  sectionAboutBg: string;
  // Footer
  footerBg: string;
  footerText: string;
  // Typography
  colorH2: string;
  colorH3: string;
  colorH4: string;
  colorH5: string;
  colorH6: string;
  colorParagraph: string;
  // Accent
  colorAccent: string;
}

export const DEFAULT_THEME: ThemeConfig = {
  sectionProductsBg: "#F9F7F2",
  sectionVideoBg: "#F9F7F2",
  sectionBrandStoryBg: "#FFFFFF",
  sectionCeoBg: "#F9F7F2",
  sectionTestimonialsBg: "#F9F7F2",
  sectionAboutBg: "#F9F7F2",
  footerBg: "#451a03",
  footerText: "#F9F7F2",
  colorH2: "#1A1A1A",
  colorH3: "#1A1A1A",
  colorH4: "#1A1A1A",
  colorH5: "#1A1A1A",
  colorH6: "#1A1A1A",
  colorParagraph: "#1A1A1A",
  colorAccent: "#C5A059",
};

export const THEME_CSS_VAR_MAP: Record<keyof ThemeConfig, string> = {
  sectionProductsBg: "--theme-section-products-bg",
  sectionVideoBg: "--theme-section-video-bg",
  sectionBrandStoryBg: "--theme-section-brand-story-bg",
  sectionCeoBg: "--theme-section-ceo-bg",
  sectionTestimonialsBg: "--theme-section-testimonials-bg",
  sectionAboutBg: "--theme-section-about-bg",
  footerBg: "--theme-footer-bg",
  footerText: "--theme-footer-text",
  colorH2: "--theme-color-h2",
  colorH3: "--theme-color-h3",
  colorH4: "--theme-color-h4",
  colorH5: "--theme-color-h5",
  colorH6: "--theme-color-h6",
  colorParagraph: "--theme-color-paragraph",
  colorAccent: "--theme-color-accent",
};

/** Convierte #RGB / #RRGGBB / #RRGGBBAA a componentes HSL para tokens shadcn (`--primary`). */
export function hexToHslComponents(hex: string, fallback = "40 48% 55%"): string {
  const raw = hex.trim().replace(/^#/, "");
  const full =
    raw.length === 3
      ? raw
          .split("")
          .map((c) => `${c}${c}`)
          .join("")
      : raw.slice(0, 6);
  if (!/^[0-9A-Fa-f]{6}$/.test(full)) return fallback;

  const n = Number.parseInt(full, 16);
  const r = ((n >> 16) & 255) / 255;
  const g = ((n >> 8) & 255) / 255;
  const b = (n & 255) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  let h = 0;
  let s = 0;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0);
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      default:
        h = (r - g) / d + 4;
    }
    h /= 6;
  }

  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}

export function applyTheme(theme: ThemeConfig) {
  const root = document.documentElement;
  for (const [key, cssVar] of Object.entries(THEME_CSS_VAR_MAP)) {
    const value = theme[key as keyof ThemeConfig] || DEFAULT_THEME[key as keyof ThemeConfig];
    root.style.setProperty(cssVar, value);
  }
  root.style.setProperty(
    "--theme-primary-hsl",
    hexToHslComponents(theme.colorAccent || DEFAULT_THEME.colorAccent),
  );
}

export function useThemeConfig() {
  const [theme, setTheme] = useState<ThemeConfig>(DEFAULT_THEME);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (supabase as any)
      .from("site_content")
      .select("content")
      .eq("key", "theme_config")
      .maybeSingle()
      .then(({ data }: any) => {
        if (data?.content) {
          try {
            const parsed = JSON.parse(data.content);
            const merged = { ...DEFAULT_THEME, ...parsed };
            setTheme(merged);
            applyTheme(merged);
          } catch {
            applyTheme(DEFAULT_THEME);
          }
        } else {
          applyTheme(DEFAULT_THEME);
        }
        setLoading(false);
      });
  }, []);

  return { theme, loading };
}

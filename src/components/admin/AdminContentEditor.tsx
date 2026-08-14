import { useEffect, useRef, useState, type DragEvent } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Monitor, Play, RotateCcw, Save, Smartphone, Sparkle, Trash2, Upload } from "lucide-react";
import {
  DEFAULT_MARQUEE_CONFIG,
  DEFAULT_MARQUEE_ITEMS,
  marqueeItemsToText,
  marqueeTextToItems,
  parseMarqueeConfig,
  serializeMarqueeConfig,
  type MarqueeConfig,
} from "@/lib/marquee-content";
import {
  DEFAULT_COLLECTION_HEADLINE,
  parseCollectionHeadlineConfig,
  serializeCollectionHeadlineConfig,
  splitHeadlineByAccent,
  type CollectionHeadlineConfig,
} from "@/lib/collection-headline-content";
import {
  DEFAULT_CAMPAIGN,
  parseCampaignConfig,
  serializeCampaignConfig,
  type CampaignConfig,
} from "@/lib/campaign-content";
import {
  DEFAULT_HERO,
  parseHeroConfig,
  serializeHeroConfig,
  type HeroConfig,
} from "@/lib/hero-content";
import {
  DEFAULT_WELCOME_POPUP,
  parseWelcomePopupConfig,
  serializeWelcomePopupConfig,
  type WelcomePopupConfig,
} from "@/lib/welcome-popup-content";
import { optimizeImageForUpload, type OptimizeImageVariant } from "@/lib/optimize-image-upload";
import { HexColorField, toPickerColor } from "@/components/admin/HexColorField";
import ProductImageCropDialog from "@/components/admin/ProductImageCropDialog";
import CampaignBanner, {
  CampaignPreviewFrame,
  CAMPAIGN_PREVIEW_VIEWPORT,
  type CampaignPreviewDevice,
} from "@/components/CampaignBanner";
import HeroSection, {
  HeroPreviewFrame,
  HERO_PREVIEW_VIEWPORT,
  type HeroPreviewDevice,
} from "@/components/HeroSection";
import { Switch } from "@/components/ui/switch";
import { WelcomePromoDialogView } from "@/components/WelcomePromoDialog";
import { cn } from "@/lib/utils";

const CAMPAIGN_BUCKET = "campaign-images";
const SUPABASE_URL = "https://vanhsuisvxvclxdgutaw.supabase.co";
/** Coincide con el banner de la home (md+). */
const CAMPAIGN_DESKTOP_ASPECT = 21 / 9;
/** Coincide con el banner de la home en móvil. */
const CAMPAIGN_MOBILE_ASPECT = 4 / 5;
/** Hero a pantalla completa (escritorio). */
const HERO_DESKTOP_ASPECT = 16 / 9;
/** Hero a pantalla completa (móvil). */
const HERO_MOBILE_ASPECT = 9 / 16;
/** Popup vertical (mockup). */
const WELCOME_POPUP_ASPECT = 9 / 16;

interface ContentBlock {
  id: string;
  key: string;
  title: string;
  content: string;
}

type SavedSnapshot = Record<string, { title: string; content: string }>;

const CONTENT_LABELS: Record<string, string> = {
  index_brand_story: "Texto principal — Página de inicio",
  index_hero: "Hero — Página de inicio",
  index_welcome_popup: "Popup bienvenida — Overlay global",
  index_marquee: "Marquesina — Debajo del hero",
  index_collection_headline: "Titular — Entre marquesina y colección",
  index_campaign: "Campaña — Después de la colección",
  about_section_1: "Sobre mí — Sección 1",
  about_section_2: "Sobre mí — Sección 2",
  about_section_3: "Sobre mí — Sección 3",
  about_section_4: "Sobre mí — Sección 4",
};

const HIDDEN_KEYS = new Set(["index_brand_story", "theme_config"]);

/** Orden preferido en el panel de Contenido */
const KEY_ORDER = [
  "index_hero",
  "index_welcome_popup",
  "index_marquee",
  "index_collection_headline",
  "index_campaign",
  "about_section_1",
  "about_section_2",
  "about_section_3",
  "about_section_4",
];

const snapshotFromBlocks = (rows: ContentBlock[]): SavedSnapshot => {
  const map: SavedSnapshot = {};
  for (const row of rows) {
    map[row.key] = { title: row.title ?? "", content: row.content ?? "" };
  }
  return map;
};

const isHex = (value: string) =>
  /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6}|[0-9A-Fa-f]{8})$/.test(value.trim());

const AdminContentEditor = () => {
  const { toast } = useToast();
  const [blocks, setBlocks] = useState<ContentBlock[]>([]);
  const [saved, setSaved] = useState<SavedSnapshot>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [marqueeDraft, setMarqueeDraft] = useState<{
    texts: string;
    background: string;
    /** String para permitir vaciar el input al editar. */
    paddingY: string;
  }>({
    texts: marqueeItemsToText(DEFAULT_MARQUEE_ITEMS),
    background: DEFAULT_MARQUEE_CONFIG.background,
    paddingY: String(DEFAULT_MARQUEE_CONFIG.paddingY),
  });
  const [headlineDraft, setHeadlineDraft] = useState<{
    text: string;
    accent: string;
    color: string;
    accentColor: string;
    fontSize: string;
  }>({
    text: DEFAULT_COLLECTION_HEADLINE.text,
    accent: DEFAULT_COLLECTION_HEADLINE.accent,
    color: DEFAULT_COLLECTION_HEADLINE.color,
    accentColor: DEFAULT_COLLECTION_HEADLINE.accentColor,
    fontSize: String(DEFAULT_COLLECTION_HEADLINE.fontSize),
  });
  const [campaignDraft, setCampaignDraft] = useState<CampaignConfig>({ ...DEFAULT_CAMPAIGN });
  const [campaignUploading, setCampaignUploading] = useState<"desktop" | "mobile" | null>(null);
  const [campaignDragOver, setCampaignDragOver] = useState<"desktop" | "mobile" | null>(null);
  const [campaignCropOpen, setCampaignCropOpen] = useState(false);
  const [campaignCropSrc, setCampaignCropSrc] = useState<string | null>(null);
  const [campaignCropVariant, setCampaignCropVariant] = useState<OptimizeImageVariant>("desktop");
  const desktopInputRef = useRef<HTMLInputElement>(null);
  const mobileInputRef = useRef<HTMLInputElement>(null);
  const [heroDraft, setHeroDraft] = useState<HeroConfig>({ ...DEFAULT_HERO });
  const [heroUploading, setHeroUploading] = useState<"desktop" | "mobile" | null>(null);
  const [heroDragOver, setHeroDragOver] = useState<"desktop" | "mobile" | null>(null);
  const [heroCropOpen, setHeroCropOpen] = useState(false);
  const [heroCropSrc, setHeroCropSrc] = useState<string | null>(null);
  const [heroCropVariant, setHeroCropVariant] = useState<OptimizeImageVariant>("desktop");
  const [heroPreviewDevice, setHeroPreviewDevice] = useState<HeroPreviewDevice>("desktop");
  const [campaignPreviewDevice, setCampaignPreviewDevice] =
    useState<CampaignPreviewDevice>("desktop");
  const heroDesktopInputRef = useRef<HTMLInputElement>(null);
  const heroMobileInputRef = useRef<HTMLInputElement>(null);
  const [welcomePopupDraft, setWelcomePopupDraft] = useState<WelcomePopupConfig>({
    ...DEFAULT_WELCOME_POPUP,
  });
  const [welcomePopupUploading, setWelcomePopupUploading] = useState(false);
  const [welcomePopupDragOver, setWelcomePopupDragOver] = useState(false);
  const [welcomePopupCropOpen, setWelcomePopupCropOpen] = useState(false);
  const [welcomePopupCropSrc, setWelcomePopupCropSrc] = useState<string | null>(null);
  const [welcomePopupPreviewOpen, setWelcomePopupPreviewOpen] = useState(false);
  const welcomePopupInputRef = useRef<HTMLInputElement>(null);

  const parsePaddingY = (raw: string): number => {
    if (raw.trim() === "") return DEFAULT_MARQUEE_CONFIG.paddingY;
    const n = Number(raw);
    if (!Number.isFinite(n)) return DEFAULT_MARQUEE_CONFIG.paddingY;
    return Math.max(0, Math.min(96, Math.round(n)));
  };

  const parseFontSize = (raw: string): number => {
    if (raw.trim() === "") return DEFAULT_COLLECTION_HEADLINE.fontSize;
    const n = Number(raw);
    if (!Number.isFinite(n)) return DEFAULT_COLLECTION_HEADLINE.fontSize;
    return Math.max(14, Math.min(96, Math.round(n)));
  };

  const buildMarqueePayload = () => {
    const bg = marqueeDraft.background.trim();
    const background = isHex(bg) ? bg : DEFAULT_MARQUEE_CONFIG.background;
    const config: MarqueeConfig = {
      items: marqueeTextToItems(marqueeDraft.texts),
      background,
      paddingY: parsePaddingY(marqueeDraft.paddingY),
    };
    return {
      title: "Marquesina del inicio",
      content: serializeMarqueeConfig(config),
      config,
    };
  };

  const buildHeadlinePayload = () => {
    const color = isHex(headlineDraft.color)
      ? headlineDraft.color.trim()
      : DEFAULT_COLLECTION_HEADLINE.color;
    const accentColor = isHex(headlineDraft.accentColor)
      ? headlineDraft.accentColor.trim()
      : DEFAULT_COLLECTION_HEADLINE.accentColor;
    const config: CollectionHeadlineConfig = {
      text: headlineDraft.text.trim() || DEFAULT_COLLECTION_HEADLINE.text,
      accent: headlineDraft.accent.trim(),
      color,
      accentColor,
      fontSize: parseFontSize(headlineDraft.fontSize),
    };
    return {
      title: "Titular de colección",
      content: serializeCollectionHeadlineConfig(config),
      config,
    };
  };

  const buildCampaignPayload = () => {
    const config: CampaignConfig = {
      desktopImageUrl: campaignDraft.desktopImageUrl.trim(),
      mobileImageUrl: campaignDraft.mobileImageUrl.trim(),
      headline: campaignDraft.headline.trim() || DEFAULT_CAMPAIGN.headline,
      headlineColor: isHex(campaignDraft.headlineColor)
        ? campaignDraft.headlineColor.trim()
        : DEFAULT_CAMPAIGN.headlineColor,
      subheadline: campaignDraft.subheadline.trim() || DEFAULT_CAMPAIGN.subheadline,
      subheadlineAccent: campaignDraft.subheadlineAccent.trim(),
      subheadlineColor: isHex(campaignDraft.subheadlineColor)
        ? campaignDraft.subheadlineColor.trim()
        : DEFAULT_CAMPAIGN.subheadlineColor,
      subheadlineAccentColor: isHex(campaignDraft.subheadlineAccentColor)
        ? campaignDraft.subheadlineAccentColor.trim()
        : DEFAULT_CAMPAIGN.subheadlineAccentColor,
      dividerColor: isHex(campaignDraft.dividerColor)
        ? campaignDraft.dividerColor.trim()
        : DEFAULT_CAMPAIGN.dividerColor,
      alt: campaignDraft.alt.trim() || DEFAULT_CAMPAIGN.alt,
      textPosX: campaignDraft.textPosX,
      textPosY: campaignDraft.textPosY,
      textPosMobileX: campaignDraft.textPosMobileX,
      textPosMobileY: campaignDraft.textPosMobileY,
    };
    return {
      title: "Campaña publicitaria",
      content: serializeCampaignConfig(config),
      config,
    };
  };

  const buildHeroPayload = () => {
    const config: HeroConfig = {
      desktopImageUrl:
        heroDraft.desktopImageUrl.trim() || DEFAULT_HERO.desktopImageUrl,
      mobileImageUrl: heroDraft.mobileImageUrl.trim() || DEFAULT_HERO.mobileImageUrl,
      line1: heroDraft.line1.trim() || DEFAULT_HERO.line1,
      line2: heroDraft.line2.trim() || DEFAULT_HERO.line2,
      line2Accent: heroDraft.line2Accent.trim(),
      headlineColor: isHex(heroDraft.headlineColor)
        ? heroDraft.headlineColor.trim()
        : DEFAULT_HERO.headlineColor,
      headlineAccentColor: isHex(heroDraft.headlineAccentColor)
        ? heroDraft.headlineAccentColor.trim()
        : DEFAULT_HERO.headlineAccentColor,
      ctaText: heroDraft.ctaText.trim() || DEFAULT_HERO.ctaText,
      ctaHref: heroDraft.ctaHref.trim() || DEFAULT_HERO.ctaHref,
      ctaBg: isHex(heroDraft.ctaBg) ? heroDraft.ctaBg.trim() : DEFAULT_HERO.ctaBg,
      ctaTextColor: isHex(heroDraft.ctaTextColor)
        ? heroDraft.ctaTextColor.trim()
        : DEFAULT_HERO.ctaTextColor,
      alt: heroDraft.alt.trim() || DEFAULT_HERO.alt,
      textPosX: heroDraft.textPosX,
      textPosY: heroDraft.textPosY,
      textPosMobileX: heroDraft.textPosMobileX,
      textPosMobileY: heroDraft.textPosMobileY,
    };
    return {
      title: "Hero del inicio",
      content: serializeHeroConfig(config),
      config,
    };
  };

  const buildWelcomePopupPayload = () => {
    const delayRaw = Number(welcomePopupDraft.delayMs);
    const config: WelcomePopupConfig = {
      enabled: Boolean(welcomePopupDraft.enabled),
      imageUrl: welcomePopupDraft.imageUrl.trim(),
      eyebrow: welcomePopupDraft.eyebrow.trim() || DEFAULT_WELCOME_POPUP.eyebrow,
      offerAmount: welcomePopupDraft.offerAmount.trim() || DEFAULT_WELCOME_POPUP.offerAmount,
      offerSuffix: welcomePopupDraft.offerSuffix.trim() || DEFAULT_WELCOME_POPUP.offerSuffix,
      badgeText: welcomePopupDraft.badgeText.trim() || DEFAULT_WELCOME_POPUP.badgeText,
      primaryCta: welcomePopupDraft.primaryCta.trim() || DEFAULT_WELCOME_POPUP.primaryCta,
      secondaryCta: welcomePopupDraft.secondaryCta.trim() || DEFAULT_WELCOME_POPUP.secondaryCta,
      emailTitle: welcomePopupDraft.emailTitle.trim() || DEFAULT_WELCOME_POPUP.emailTitle,
      emailDescription:
        welcomePopupDraft.emailDescription.trim() || DEFAULT_WELCOME_POPUP.emailDescription,
      emailCta: welcomePopupDraft.emailCta.trim() || DEFAULT_WELCOME_POPUP.emailCta,
      pink: isHex(welcomePopupDraft.pink)
        ? welcomePopupDraft.pink.trim()
        : DEFAULT_WELCOME_POPUP.pink,
      gold: isHex(welcomePopupDraft.gold)
        ? welcomePopupDraft.gold.trim()
        : DEFAULT_WELCOME_POPUP.gold,
      delayMs: Number.isFinite(delayRaw)
        ? Math.min(15000, Math.max(0, Math.round(delayRaw)))
        : DEFAULT_WELCOME_POPUP.delayMs,
      alt: welcomePopupDraft.alt.trim() || DEFAULT_WELCOME_POPUP.alt,
    };
    return {
      title: "Popup de bienvenida",
      content: serializeWelcomePopupConfig(config),
      config,
    };
  };

  const uploadCampaignImage = async (file: File, variant: OptimizeImageVariant) => {
    setCampaignUploading(variant);
    try {
      const optimized = await optimizeImageForUpload(file, variant);
      const filePath = `${variant}-${Date.now()}.${optimized.extension}`;
      const { error: uploadError } = await supabase.storage
        .from(CAMPAIGN_BUCKET)
        .upload(filePath, optimized.blob, {
          upsert: true,
          contentType: optimized.mimeType,
        });
      if (uploadError) throw uploadError;

      const publicUrl = `${SUPABASE_URL}/storage/v1/object/public/${CAMPAIGN_BUCKET}/${filePath}`;
      setCampaignDraft((prev) => ({
        ...prev,
        ...(variant === "desktop"
          ? { desktopImageUrl: publicUrl }
          : { mobileImageUrl: publicUrl }),
      }));
      toast({
        title: "Imagen subida",
        description: `Versión ${variant === "desktop" ? "escritorio/tablet" : "móvil"} optimizada (${optimized.extension.toUpperCase()}).`,
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "No se pudo subir la imagen.";
      toast({ title: "Error al subir", description: message, variant: "destructive" });
      throw err instanceof Error ? err : new Error(message);
    } finally {
      setCampaignUploading(null);
    }
  };

  const beginCampaignCrop = (file: File, variant: OptimizeImageVariant) => {
    if (!file.type.startsWith("image/")) {
      toast({
        title: "Archivo no válido",
        description: "Selecciona una imagen.",
        variant: "destructive",
      });
      return;
    }
    if (campaignCropSrc?.startsWith("blob:")) {
      URL.revokeObjectURL(campaignCropSrc);
    }
    setCampaignCropVariant(variant);
    setCampaignCropSrc(URL.createObjectURL(file));
    setCampaignCropOpen(true);
  };

  const handleCampaignCropOpenChange = (open: boolean) => {
    setCampaignCropOpen(open);
    if (!open && campaignCropSrc?.startsWith("blob:")) {
      URL.revokeObjectURL(campaignCropSrc);
      setCampaignCropSrc(null);
    }
  };

  const handleCampaignDrop = (e: DragEvent, variant: OptimizeImageVariant) => {
    e.preventDefault();
    e.stopPropagation();
    setCampaignDragOver(null);
    if (campaignUploading || campaignCropOpen) return;
    const file = Array.from(e.dataTransfer.files || []).find((f) => f.type.startsWith("image/"));
    if (file) beginCampaignCrop(file, variant);
  };

  const uploadHeroImage = async (file: File, variant: OptimizeImageVariant) => {
    setHeroUploading(variant);
    try {
      const optimized = await optimizeImageForUpload(file, variant);
      const filePath = `hero-${variant}-${Date.now()}.${optimized.extension}`;
      const { error: uploadError } = await supabase.storage
        .from(CAMPAIGN_BUCKET)
        .upload(filePath, optimized.blob, {
          upsert: true,
          contentType: optimized.mimeType,
        });
      if (uploadError) throw uploadError;

      const publicUrl = `${SUPABASE_URL}/storage/v1/object/public/${CAMPAIGN_BUCKET}/${filePath}`;
      setHeroDraft((prev) => ({
        ...prev,
        ...(variant === "desktop"
          ? { desktopImageUrl: publicUrl }
          : { mobileImageUrl: publicUrl }),
      }));
      toast({
        title: "Imagen subida",
        description: `Versión ${variant === "desktop" ? "escritorio/tablet" : "móvil"} optimizada (${optimized.extension.toUpperCase()}).`,
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "No se pudo subir la imagen.";
      toast({ title: "Error al subir", description: message, variant: "destructive" });
      throw err instanceof Error ? err : new Error(message);
    } finally {
      setHeroUploading(null);
    }
  };

  const beginHeroCrop = (file: File, variant: OptimizeImageVariant) => {
    if (!file.type.startsWith("image/")) {
      toast({
        title: "Archivo no válido",
        description: "Selecciona una imagen.",
        variant: "destructive",
      });
      return;
    }
    if (heroCropSrc?.startsWith("blob:")) {
      URL.revokeObjectURL(heroCropSrc);
    }
    setHeroCropVariant(variant);
    setHeroCropSrc(URL.createObjectURL(file));
    setHeroCropOpen(true);
  };

  const handleHeroCropOpenChange = (open: boolean) => {
    setHeroCropOpen(open);
    if (!open && heroCropSrc?.startsWith("blob:")) {
      URL.revokeObjectURL(heroCropSrc);
      setHeroCropSrc(null);
    }
  };

  const handleHeroDrop = (e: DragEvent, variant: OptimizeImageVariant) => {
    e.preventDefault();
    e.stopPropagation();
    setHeroDragOver(null);
    if (heroUploading || heroCropOpen) return;
    const file = Array.from(e.dataTransfer.files || []).find((f) => f.type.startsWith("image/"));
    if (file) beginHeroCrop(file, variant);
  };

  const uploadWelcomePopupImage = async (file: File) => {
    setWelcomePopupUploading(true);
    try {
      const optimized = await optimizeImageForUpload(file, "mobile");
      const filePath = `welcome-popup-${Date.now()}.${optimized.extension}`;
      const { error: uploadError } = await supabase.storage
        .from(CAMPAIGN_BUCKET)
        .upload(filePath, optimized.blob, {
          upsert: true,
          contentType: optimized.mimeType,
        });
      if (uploadError) throw uploadError;

      const publicUrl = `${SUPABASE_URL}/storage/v1/object/public/${CAMPAIGN_BUCKET}/${filePath}`;
      setWelcomePopupDraft((prev) => ({ ...prev, imageUrl: publicUrl }));
      toast({
        title: "Imagen subida",
        description: `Imagen del popup optimizada (${optimized.extension.toUpperCase()}).`,
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "No se pudo subir la imagen.";
      toast({ title: "Error al subir", description: message, variant: "destructive" });
      throw err instanceof Error ? err : new Error(message);
    } finally {
      setWelcomePopupUploading(false);
    }
  };

  const beginWelcomePopupCrop = (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast({
        title: "Archivo no válido",
        description: "Selecciona una imagen.",
        variant: "destructive",
      });
      return;
    }
    if (welcomePopupCropSrc?.startsWith("blob:")) {
      URL.revokeObjectURL(welcomePopupCropSrc);
    }
    setWelcomePopupCropSrc(URL.createObjectURL(file));
    setWelcomePopupCropOpen(true);
  };

  const handleWelcomePopupCropOpenChange = (open: boolean) => {
    setWelcomePopupCropOpen(open);
    if (!open && welcomePopupCropSrc?.startsWith("blob:")) {
      URL.revokeObjectURL(welcomePopupCropSrc);
      setWelcomePopupCropSrc(null);
    }
  };

  const handleWelcomePopupDrop = (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setWelcomePopupDragOver(false);
    if (welcomePopupUploading || welcomePopupCropOpen) return;
    const file = Array.from(e.dataTransfer.files || []).find((f) => f.type.startsWith("image/"));
    if (file) beginWelcomePopupCrop(file);
  };

  useEffect(() => {
    const load = async () => {
      const { data, error } = await (supabase as any)
        .from("site_content")
        .select("*")
        .order("key");

      if (error) {
        setLoading(false);
        return;
      }

      let rows: ContentBlock[] = data || [];

      const hasHero = rows.some((b) => b.key === "index_hero");
      if (!hasHero) {
        const { data: inserted } = await (supabase as any)
          .from("site_content")
          .insert({
            key: "index_hero",
            title: "Hero del inicio",
            content: serializeHeroConfig(DEFAULT_HERO),
          })
          .select("*")
          .single();

        if (inserted) rows = [...rows, inserted];
      }

      const hasWelcomePopup = rows.some((b) => b.key === "index_welcome_popup");
      if (!hasWelcomePopup) {
        const { data: inserted } = await (supabase as any)
          .from("site_content")
          .insert({
            key: "index_welcome_popup",
            title: "Popup de bienvenida",
            content: serializeWelcomePopupConfig(DEFAULT_WELCOME_POPUP),
          })
          .select("*")
          .single();

        if (inserted) rows = [...rows, inserted];
      }

      const hasMarquee = rows.some((b) => b.key === "index_marquee");
      if (!hasMarquee) {
        const seed: MarqueeConfig = {
          items: [...DEFAULT_MARQUEE_ITEMS],
          background: DEFAULT_MARQUEE_CONFIG.background,
          paddingY: DEFAULT_MARQUEE_CONFIG.paddingY,
        };
        const { data: inserted } = await (supabase as any)
          .from("site_content")
          .insert({
            key: "index_marquee",
            title: "Marquesina del inicio",
            content: serializeMarqueeConfig(seed),
          })
          .select("*")
          .single();

        if (inserted) rows = [...rows, inserted];
      }

      const hasHeadline = rows.some((b) => b.key === "index_collection_headline");
      if (!hasHeadline) {
        const { data: inserted } = await (supabase as any)
          .from("site_content")
          .insert({
            key: "index_collection_headline",
            title: "Titular de colección",
            content: serializeCollectionHeadlineConfig(DEFAULT_COLLECTION_HEADLINE),
          })
          .select("*")
          .single();

        if (inserted) rows = [...rows, inserted];
      }

      const hasCampaign = rows.some((b) => b.key === "index_campaign");
      if (!hasCampaign) {
        const { data: inserted } = await (supabase as any)
          .from("site_content")
          .insert({
            key: "index_campaign",
            title: "Campaña publicitaria",
            content: serializeCampaignConfig(DEFAULT_CAMPAIGN),
          })
          .select("*")
          .single();

        if (inserted) rows = [...rows, inserted];
      }

      const heroRow = rows.find((b) => b.key === "index_hero");
      if (heroRow) {
        const cfg = parseHeroConfig(heroRow.content);
        setHeroDraft(cfg);
        heroRow.title = "Hero del inicio";
        heroRow.content = serializeHeroConfig(cfg);
      }

      const welcomePopupRow = rows.find((b) => b.key === "index_welcome_popup");
      if (welcomePopupRow) {
        const cfg = parseWelcomePopupConfig(welcomePopupRow.content);
        setWelcomePopupDraft(cfg);
        welcomePopupRow.title = "Popup de bienvenida";
        welcomePopupRow.content = serializeWelcomePopupConfig(cfg);
      }

      const marqueeRow = rows.find((b) => b.key === "index_marquee");
      if (marqueeRow) {
        const cfg = parseMarqueeConfig(marqueeRow.content);
        setMarqueeDraft({
          texts: marqueeItemsToText(cfg.items),
          background: cfg.background,
          paddingY: String(cfg.paddingY),
        });
        marqueeRow.title = "Marquesina del inicio";
        marqueeRow.content = serializeMarqueeConfig(cfg);
      }

      const headlineRow = rows.find((b) => b.key === "index_collection_headline");
      if (headlineRow) {
        const cfg = parseCollectionHeadlineConfig(headlineRow.content);
        setHeadlineDraft({
          text: cfg.text,
          accent: cfg.accent,
          color: cfg.color,
          accentColor: cfg.accentColor,
          fontSize: String(cfg.fontSize),
        });
        headlineRow.title = "Titular de colección";
        headlineRow.content = serializeCollectionHeadlineConfig(cfg);
      }

      const campaignRow = rows.find((b) => b.key === "index_campaign");
      if (campaignRow) {
        const cfg = parseCampaignConfig(campaignRow.content);
        setCampaignDraft(cfg);
        campaignRow.title = "Campaña publicitaria";
        campaignRow.content = serializeCampaignConfig(cfg);
      }

      setBlocks(rows);
      setSaved(snapshotFromBlocks(rows));
      setLoading(false);
    };

    load();
  }, []);

  const updateField = (key: string, field: "title" | "content", value: string) => {
    setBlocks((prev) =>
      prev.map((b) => (b.key === key ? { ...b, [field]: value } : b))
    );
  };

  const isBlockDirty = (block: ContentBlock): boolean => {
    const baseline = saved[block.key];
    if (!baseline) return true;
    if (block.key === "index_hero") {
      const payload = buildHeroPayload();
      return payload.title !== baseline.title || payload.content !== baseline.content;
    }
    if (block.key === "index_welcome_popup") {
      const payload = buildWelcomePopupPayload();
      return payload.title !== baseline.title || payload.content !== baseline.content;
    }
    if (block.key === "index_marquee") {
      const payload = buildMarqueePayload();
      return payload.title !== baseline.title || payload.content !== baseline.content;
    }
    if (block.key === "index_collection_headline") {
      const payload = buildHeadlinePayload();
      return payload.title !== baseline.title || payload.content !== baseline.content;
    }
    if (block.key === "index_campaign") {
      const payload = buildCampaignPayload();
      return payload.title !== baseline.title || payload.content !== baseline.content;
    }
    return (block.title ?? "") !== baseline.title || (block.content ?? "") !== baseline.content;
  };

  const saveBlock = async (block: ContentBlock) => {
    if (!isBlockDirty(block)) return;
    setSaving(block.key);

    let payload = { title: block.title, content: block.content };

    if (block.key === "index_hero") {
      const { title, content, config } = buildHeroPayload();
      payload = { title, content };
      setHeroDraft(config);
      setBlocks((prev) =>
        prev.map((b) =>
          b.key === "index_hero" ? { ...b, title: payload.title, content: payload.content } : b
        )
      );
    }

    if (block.key === "index_welcome_popup") {
      const { title, content, config } = buildWelcomePopupPayload();
      payload = { title, content };
      setWelcomePopupDraft(config);
      setBlocks((prev) =>
        prev.map((b) =>
          b.key === "index_welcome_popup"
            ? { ...b, title: payload.title, content: payload.content }
            : b
        )
      );
    }

    if (block.key === "index_marquee") {
      const { title, content, config } = buildMarqueePayload();
      payload = { title, content };
      setMarqueeDraft({
        background: config.background,
        paddingY: String(config.paddingY),
        texts: marqueeItemsToText(config.items),
      });
      setBlocks((prev) =>
        prev.map((b) =>
          b.key === "index_marquee" ? { ...b, title: payload.title, content: payload.content } : b
        )
      );
    }

    if (block.key === "index_collection_headline") {
      const { title, content, config } = buildHeadlinePayload();
      payload = { title, content };
      setHeadlineDraft({
        text: config.text,
        accent: config.accent,
        color: config.color,
        accentColor: config.accentColor,
        fontSize: String(config.fontSize),
      });
      setBlocks((prev) =>
        prev.map((b) =>
          b.key === "index_collection_headline"
            ? { ...b, title: payload.title, content: payload.content }
            : b
        )
      );
    }

    if (block.key === "index_campaign") {
      const { title, content, config } = buildCampaignPayload();
      payload = { title, content };
      setCampaignDraft(config);
      setBlocks((prev) =>
        prev.map((b) =>
          b.key === "index_campaign" ? { ...b, title: payload.title, content: payload.content } : b
        )
      );
    }

    const { error } = await (supabase as any)
      .from("site_content")
      .update({ ...payload, updated_at: new Date().toISOString() })
      .eq("id", block.id);

    if (error) {
      toast({ title: "Error", description: "No se pudo guardar.", variant: "destructive" });
    } else {
      setSaved((prev) => ({
        ...prev,
        [block.key]: { title: payload.title ?? "", content: payload.content ?? "" },
      }));
      toast({ title: "Guardado", description: `"${CONTENT_LABELS[block.key] || block.key}" actualizado.` });
    }
    setSaving(null);
  };

  if (loading) {
    return (
      <div className="p-8 text-center">
        <Loader2 className="h-6 w-6 animate-spin text-gold mx-auto" />
      </div>
    );
  }

  if (blocks.length === 0) {
    return (
      <div className="p-8 text-center text-carbon/40">
        No hay contenido editable configurado. Ejecuta la migración de base de datos.
      </div>
    );
  }

  const visibleBlocks = blocks
    .filter((block) => !HIDDEN_KEYS.has(block.key))
    .sort((a, b) => {
      const ai = KEY_ORDER.indexOf(a.key);
      const bi = KEY_ORDER.indexOf(b.key);
      const aPos = ai === -1 ? KEY_ORDER.length : ai;
      const bPos = bi === -1 ? KEY_ORDER.length : bi;
      return aPos - bPos || a.key.localeCompare(b.key);
    });

  const headlinePreviewParts = splitHeadlineByAccent(headlineDraft.text, headlineDraft.accent);
  const headlinePreviewSize = parseFontSize(headlineDraft.fontSize);
  const heroPreviewConfig = buildHeroPayload().config;
  const campaignPreviewConfig = buildCampaignPayload().config;

  return (
    <>
    <div className="space-y-6">
      {visibleBlocks.map((block) => {
        const isHero = block.key === "index_hero";
        const isWelcomePopup = block.key === "index_welcome_popup";
        const isMarquee = block.key === "index_marquee";
        const isHeadline = block.key === "index_collection_headline";
        const isCampaign = block.key === "index_campaign";
        const dirty = isBlockDirty(block);

        return (
          <div
            key={block.key}
            className={cn(
              "bg-white rounded-xl shadow-[0_4px_20px_rgba(0,0,0,0.04)] p-6",
              (isHero || isCampaign || isWelcomePopup) && "ring-1 ring-gold/20",
            )}
          >
            <h3 className="font-playfair text-base font-semibold text-carbon mb-4">
              {CONTENT_LABELS[block.key] || block.key}
            </h3>
            {isHero && (
              <p className="text-xs text-carbon/40 -mt-2 mb-4">
                Banner principal a pantalla completa. Imágenes, textos, CTA y posición arrastrable.
              </p>
            )}
            {isWelcomePopup && (
              <p className="text-xs text-carbon/40 -mt-2 mb-4">
                Overlay global en la primera visita. El descuento real se configura en Códigos dto.
                (oferta welcome).
              </p>
            )}

            <div className="space-y-4">
              {!isMarquee && !isHeadline && !isCampaign && !isHero && !isWelcomePopup && (
                <div>
                  <Label className="text-carbon/60 text-xs uppercase tracking-wider">Título</Label>
                  <Input
                    value={block.title}
                    onChange={(e) => updateField(block.key, "title", e.target.value)}
                    className="mt-1 border-gold/20 focus-visible:ring-gold/30"
                  />
                </div>
              )}

              {isMarquee && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-carbon/60 text-xs uppercase tracking-wider">
                      Color de fondo
                    </Label>
                    <div className="mt-1 flex items-center gap-2">
                      <HexColorField
                        value={marqueeDraft.background}
                        onChange={(hex) =>
                          setMarqueeDraft((prev) => ({ ...prev, background: hex }))
                        }
                        fallback={DEFAULT_MARQUEE_CONFIG.background}
                        aria-label="Color de fondo de la marquesina"
                        className="flex-1 min-w-0"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={
                          toPickerColor(marqueeDraft.background) ===
                          toPickerColor(DEFAULT_MARQUEE_CONFIG.background)
                        }
                        onClick={() =>
                          setMarqueeDraft((prev) => ({
                            ...prev,
                            background: DEFAULT_MARQUEE_CONFIG.background,
                          }))
                        }
                        className="shrink-0 border-gold/20 text-carbon/60 hover:text-carbon disabled:opacity-40 h-10"
                        aria-label="Restaurar color original"
                        title="Restaurar color original"
                      >
                        <RotateCcw className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>

                  <div>
                    <Label className="text-carbon/60 text-xs uppercase tracking-wider">
                      Padding vertical (px)
                    </Label>
                    <div className="mt-1 flex items-center gap-2">
                      <Input
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        value={marqueeDraft.paddingY}
                        onChange={(e) => {
                          const next = e.target.value.replace(/[^\d]/g, "");
                          setMarqueeDraft((prev) => ({ ...prev, paddingY: next }));
                        }}
                        onBlur={() => {
                          setMarqueeDraft((prev) => ({
                            ...prev,
                            paddingY: String(parsePaddingY(prev.paddingY)),
                          }));
                        }}
                        className="border-gold/20 focus-visible:ring-gold/30"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={
                          parsePaddingY(marqueeDraft.paddingY) ===
                          DEFAULT_MARQUEE_CONFIG.paddingY
                        }
                        onClick={() =>
                          setMarqueeDraft((prev) => ({
                            ...prev,
                            paddingY: String(DEFAULT_MARQUEE_CONFIG.paddingY),
                          }))
                        }
                        className="shrink-0 border-gold/20 text-carbon/60 hover:text-carbon disabled:opacity-40 h-10"
                        aria-label="Restaurar padding original"
                        title="Restaurar padding original (26px)"
                      >
                        <RotateCcw className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                    <p className="text-xs text-carbon/30 mt-1">
                      Espacio arriba y abajo (0–96 px).
                    </p>
                  </div>
                </div>
              )}

              {isHeadline && (
                <>
                  <div>
                    <Label className="text-carbon/60 text-xs uppercase tracking-wider">Texto</Label>
                    <Input
                      value={headlineDraft.text}
                      onChange={(e) =>
                        setHeadlineDraft((prev) => ({ ...prev, text: e.target.value }))
                      }
                      className="mt-1 border-gold/20 focus-visible:ring-gold/30"
                    />
                  </div>

                  <div>
                    <Label className="text-carbon/60 text-xs uppercase tracking-wider">
                      Texto en color de acento
                    </Label>
                    <Input
                      value={headlineDraft.accent}
                      onChange={(e) =>
                        setHeadlineDraft((prev) => ({ ...prev, accent: e.target.value }))
                      }
                      className="mt-1 border-gold/20 focus-visible:ring-gold/30"
                      placeholder="tus cejas"
                    />
                    <p className="text-xs text-carbon/30 mt-1">
                      Debe coincidir con un fragmento del texto de arriba.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <Label className="text-carbon/60 text-xs uppercase tracking-wider">
                        Color del texto
                      </Label>
                      <div className="mt-1 flex items-center gap-2">
                        <HexColorField
                          value={headlineDraft.color}
                          onChange={(hex) =>
                            setHeadlineDraft((prev) => ({ ...prev, color: hex }))
                          }
                          fallback={DEFAULT_COLLECTION_HEADLINE.color}
                          aria-label="Color del titular"
                          className="flex-1 min-w-0"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={
                            toPickerColor(headlineDraft.color) ===
                            toPickerColor(DEFAULT_COLLECTION_HEADLINE.color)
                          }
                          onClick={() =>
                            setHeadlineDraft((prev) => ({
                              ...prev,
                              color: DEFAULT_COLLECTION_HEADLINE.color,
                            }))
                          }
                          className="shrink-0 border-gold/20 text-carbon/60 hover:text-carbon disabled:opacity-40 h-10"
                          aria-label="Restaurar color del texto"
                          title="Restaurar color del texto"
                        >
                          <RotateCcw className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>

                    <div>
                      <Label className="text-carbon/60 text-xs uppercase tracking-wider">
                        Color de acento
                      </Label>
                      <div className="mt-1 flex items-center gap-2">
                        <HexColorField
                          value={headlineDraft.accentColor}
                          onChange={(hex) =>
                            setHeadlineDraft((prev) => ({ ...prev, accentColor: hex }))
                          }
                          fallback={DEFAULT_COLLECTION_HEADLINE.accentColor}
                          aria-label="Color de acento del titular"
                          className="flex-1 min-w-0"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={
                            toPickerColor(headlineDraft.accentColor) ===
                            toPickerColor(DEFAULT_COLLECTION_HEADLINE.accentColor)
                          }
                          onClick={() =>
                            setHeadlineDraft((prev) => ({
                              ...prev,
                              accentColor: DEFAULT_COLLECTION_HEADLINE.accentColor,
                            }))
                          }
                          className="shrink-0 border-gold/20 text-carbon/60 hover:text-carbon disabled:opacity-40 h-10"
                          aria-label="Restaurar color de acento"
                          title="Restaurar color de acento"
                        >
                          <RotateCcw className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>

                    <div>
                      <Label className="text-carbon/60 text-xs uppercase tracking-wider">
                        Tamaño (px)
                      </Label>
                      <div className="mt-1 flex items-center gap-2">
                        <Input
                          type="text"
                          inputMode="numeric"
                          pattern="[0-9]*"
                          value={headlineDraft.fontSize}
                          onChange={(e) => {
                            const next = e.target.value.replace(/[^\d]/g, "");
                            setHeadlineDraft((prev) => ({ ...prev, fontSize: next }));
                          }}
                          onBlur={() => {
                            setHeadlineDraft((prev) => ({
                              ...prev,
                              fontSize: String(parseFontSize(prev.fontSize)),
                            }));
                          }}
                          className="border-gold/20 focus-visible:ring-gold/30"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={
                            parseFontSize(headlineDraft.fontSize) ===
                            DEFAULT_COLLECTION_HEADLINE.fontSize
                          }
                          onClick={() =>
                            setHeadlineDraft((prev) => ({
                              ...prev,
                              fontSize: String(DEFAULT_COLLECTION_HEADLINE.fontSize),
                            }))
                          }
                          className="shrink-0 border-gold/20 text-carbon/60 hover:text-carbon disabled:opacity-40 h-10"
                          aria-label="Restaurar tamaño original"
                          title="Restaurar tamaño original (24px)"
                        >
                          <RotateCcw className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                      <p className="text-xs text-carbon/30 mt-1">14–96 px.</p>
                    </div>
                  </div>

                  <div
                    className="rounded-lg border border-carbon/10 px-4 py-6 text-center"
                    style={{ backgroundColor: "#F8F3EB" }}
                  >
                    <p
                      className="font-cormorant leading-snug"
                      style={{
                        color: isHex(headlineDraft.color)
                          ? headlineDraft.color
                          : DEFAULT_COLLECTION_HEADLINE.color,
                        fontSize: `${Math.min(headlinePreviewSize, 28)}px`,
                      }}
                    >
                      {headlinePreviewParts ? (
                        <>
                          {headlinePreviewParts.before}
                          <span
                            className="italic"
                            style={{
                              color: isHex(headlineDraft.accentColor)
                                ? headlineDraft.accentColor
                                : DEFAULT_COLLECTION_HEADLINE.accentColor,
                            }}
                          >
                            {headlinePreviewParts.accent}
                          </span>
                          {headlinePreviewParts.after}
                        </>
                      ) : (
                        headlineDraft.text || "…"
                      )}
                    </p>
                    <p className="text-xs text-carbon/30 mt-3">
                      Vista previa (tamaño web: {headlinePreviewSize}px)
                    </p>
                  </div>
                </>
              )}

              {isHero && (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label className="text-carbon/60 text-xs uppercase tracking-wider">
                        Imagen escritorio / tablet
                      </Label>
                      <input
                        ref={heroDesktopInputRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          e.target.value = "";
                          if (file) beginHeroCrop(file, "desktop");
                        }}
                      />
                      <div
                        role="button"
                        tabIndex={0}
                        onClick={() => {
                          if (heroUploading) return;
                          heroDesktopInputRef.current?.click();
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            if (!heroUploading) heroDesktopInputRef.current?.click();
                          }
                        }}
                        onDragEnter={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setHeroDragOver("desktop");
                        }}
                        onDragOver={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setHeroDragOver("desktop");
                        }}
                        onDragLeave={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setHeroDragOver((prev) => (prev === "desktop" ? null : prev));
                        }}
                        onDrop={(e) => handleHeroDrop(e, "desktop")}
                        className={cn(
                          "relative mt-2 cursor-pointer overflow-hidden rounded-xl border-2 border-dashed transition-all duration-200",
                          heroDragOver === "desktop"
                            ? "border-gold bg-gold/5 scale-[1.01]"
                            : "border-gold/20 hover:border-gold/40",
                          heroDraft.desktopImageUrl ? "aspect-video bg-muted" : "min-h-36 bg-muted/40",
                        )}
                      >
                        {heroUploading === "desktop" && (
                          <div className="absolute inset-0 z-10 flex items-center justify-center bg-carbon/40">
                            <Loader2 className="h-7 w-7 animate-spin text-white" />
                          </div>
                        )}
                        {heroDraft.desktopImageUrl ? (
                          <img
                            src={heroDraft.desktopImageUrl}
                            alt="Vista previa escritorio"
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="flex h-full min-h-36 flex-col items-center justify-center gap-2 px-4 py-8 text-carbon/40">
                            <Upload className="h-8 w-8" />
                            <span className="text-sm text-center">Arrastra una imagen o haz clic</span>
                          </div>
                        )}
                        {heroDraft.desktopImageUrl && heroUploading !== "desktop" && (
                          <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-carbon/0 opacity-0 transition-opacity hover:bg-carbon/30 hover:opacity-100">
                            <span className="rounded-lg bg-carbon/60 px-3 py-1.5 text-xs text-white">
                              Cambiar imagen
                            </span>
                          </div>
                        )}
                      </div>
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        {heroDraft.desktopImageUrl &&
                          heroDraft.desktopImageUrl !== DEFAULT_HERO.desktopImageUrl && (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              setHeroDraft((prev) => ({
                                ...prev,
                                desktopImageUrl: DEFAULT_HERO.desktopImageUrl,
                              }))
                            }
                            className="border-gold/20 text-carbon/60"
                          >
                            <Trash2 className="h-3.5 w-3.5 mr-1.5" />
                            Restaurar original
                          </Button>
                        )}
                        <p className="text-xs text-carbon/30">
                          Obligatoria para el banner principal.
                        </p>
                      </div>
                    </div>

                    <div>
                      <Label className="text-carbon/60 text-xs uppercase tracking-wider">
                        Imagen móvil
                      </Label>
                      <input
                        ref={heroMobileInputRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          e.target.value = "";
                          if (file) beginHeroCrop(file, "mobile");
                        }}
                      />
                      <div
                        role="button"
                        tabIndex={0}
                        onClick={() => {
                          if (heroUploading) return;
                          heroMobileInputRef.current?.click();
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            if (!heroUploading) heroMobileInputRef.current?.click();
                          }
                        }}
                        onDragEnter={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setHeroDragOver("mobile");
                        }}
                        onDragOver={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setHeroDragOver("mobile");
                        }}
                        onDragLeave={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setHeroDragOver((prev) => (prev === "mobile" ? null : prev));
                        }}
                        onDrop={(e) => handleHeroDrop(e, "mobile")}
                        className={cn(
                          "relative mt-2 cursor-pointer overflow-hidden rounded-xl border-2 border-dashed transition-all duration-200",
                          heroDragOver === "mobile"
                            ? "border-gold bg-gold/5 scale-[1.01]"
                            : "border-gold/20 hover:border-gold/40",
                          heroDraft.mobileImageUrl
                            ? "aspect-9/16 max-h-56 bg-muted"
                            : "min-h-36 bg-muted/40",
                        )}
                      >
                        {heroUploading === "mobile" && (
                          <div className="absolute inset-0 z-10 flex items-center justify-center bg-carbon/40">
                            <Loader2 className="h-7 w-7 animate-spin text-white" />
                          </div>
                        )}
                        {heroDraft.mobileImageUrl ? (
                          <img
                            src={heroDraft.mobileImageUrl}
                            alt="Vista previa móvil"
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="flex h-full min-h-36 flex-col items-center justify-center gap-2 px-4 py-8 text-carbon/40">
                            <Upload className="h-8 w-8" />
                            <span className="text-sm text-center">Arrastra una imagen o haz clic</span>
                          </div>
                        )}
                        {heroDraft.mobileImageUrl && heroUploading !== "mobile" && (
                          <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-carbon/0 opacity-0 transition-opacity hover:bg-carbon/30 hover:opacity-100">
                            <span className="rounded-lg bg-carbon/60 px-3 py-1.5 text-xs text-white">
                              Cambiar imagen
                            </span>
                          </div>
                        )}
                      </div>
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        {heroDraft.mobileImageUrl && (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              setHeroDraft((prev) => ({
                                ...prev,
                                mobileImageUrl: "",
                              }))
                            }
                            className="border-gold/20 text-carbon/60"
                          >
                            <Trash2 className="h-3.5 w-3.5 mr-1.5" />
                            Quitar
                          </Button>
                        )}
                        <p className="text-xs text-carbon/30">
                          Opcional; si falta se usa la de escritorio.
                        </p>
                      </div>
                    </div>
                  </div>

                  <p className="text-xs text-carbon/30">
                    Tras elegir la imagen podrás recortar la zona visible. Se convierte a WebP
                    (máx. 1920px escritorio / 1080px móvil).
                  </p>

                  <div>
                    <Label className="text-carbon/60 text-xs uppercase tracking-wider">
                      Línea 1
                    </Label>
                    <Input
                      value={heroDraft.line1}
                      onChange={(e) =>
                        setHeroDraft((prev) => ({ ...prev, line1: e.target.value }))
                      }
                      className="mt-1 border-gold/20 focus-visible:ring-gold/30"
                    />
                  </div>

                  <div>
                    <Label className="text-carbon/60 text-xs uppercase tracking-wider">
                      Línea 2
                    </Label>
                    <Input
                      value={heroDraft.line2}
                      onChange={(e) =>
                        setHeroDraft((prev) => ({ ...prev, line2: e.target.value }))
                      }
                      className="mt-1 border-gold/20 focus-visible:ring-gold/30"
                    />
                  </div>

                  <div>
                    <Label className="text-carbon/60 text-xs uppercase tracking-wider">
                      Texto en color de acento
                    </Label>
                    <Input
                      value={heroDraft.line2Accent}
                      onChange={(e) =>
                        setHeroDraft((prev) => ({ ...prev, line2Accent: e.target.value }))
                      }
                      className="mt-1 border-gold/20 focus-visible:ring-gold/30"
                      placeholder="define"
                    />
                    <p className="text-xs text-carbon/30 mt-1">
                      Debe coincidir con un fragmento de la línea 2.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <Label className="text-carbon/60 text-xs uppercase tracking-wider">
                        Color del titular
                      </Label>
                      <div className="mt-1 flex items-center gap-2">
                        <HexColorField
                          value={heroDraft.headlineColor}
                          onChange={(hex) =>
                            setHeroDraft((prev) => ({ ...prev, headlineColor: hex }))
                          }
                          fallback={DEFAULT_HERO.headlineColor}
                          aria-label="Color del titular del hero"
                          className="flex-1 min-w-0"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={
                            toPickerColor(heroDraft.headlineColor) ===
                            toPickerColor(DEFAULT_HERO.headlineColor)
                          }
                          onClick={() =>
                            setHeroDraft((prev) => ({
                              ...prev,
                              headlineColor: DEFAULT_HERO.headlineColor,
                            }))
                          }
                          className="shrink-0 border-gold/20 text-carbon/60 hover:text-carbon disabled:opacity-40 h-10"
                          aria-label="Restaurar color del titular"
                        >
                          <RotateCcw className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>

                    <div>
                      <Label className="text-carbon/60 text-xs uppercase tracking-wider">
                        Color de acento
                      </Label>
                      <div className="mt-1 flex items-center gap-2">
                        <HexColorField
                          value={heroDraft.headlineAccentColor}
                          onChange={(hex) =>
                            setHeroDraft((prev) => ({ ...prev, headlineAccentColor: hex }))
                          }
                          fallback={DEFAULT_HERO.headlineAccentColor}
                          aria-label="Color de acento del hero"
                          className="flex-1 min-w-0"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={
                            toPickerColor(heroDraft.headlineAccentColor) ===
                            toPickerColor(DEFAULT_HERO.headlineAccentColor)
                          }
                          onClick={() =>
                            setHeroDraft((prev) => ({
                              ...prev,
                              headlineAccentColor: DEFAULT_HERO.headlineAccentColor,
                            }))
                          }
                          className="shrink-0 border-gold/20 text-carbon/60 hover:text-carbon disabled:opacity-40 h-10"
                          aria-label="Restaurar color de acento"
                        >
                          <RotateCcw className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <Label className="text-carbon/60 text-xs uppercase tracking-wider">
                        Texto del CTA
                      </Label>
                      <Input
                        value={heroDraft.ctaText}
                        onChange={(e) =>
                          setHeroDraft((prev) => ({ ...prev, ctaText: e.target.value }))
                        }
                        className="mt-1 border-gold/20 focus-visible:ring-gold/30"
                      />
                    </div>
                    <div>
                      <Label className="text-carbon/60 text-xs uppercase tracking-wider">
                        Enlace del CTA
                      </Label>
                      <Input
                        value={heroDraft.ctaHref}
                        onChange={(e) =>
                          setHeroDraft((prev) => ({ ...prev, ctaHref: e.target.value }))
                        }
                        className="mt-1 border-gold/20 focus-visible:ring-gold/30"
                        placeholder="/tienda"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <Label className="text-carbon/60 text-xs uppercase tracking-wider">
                        Fondo del CTA
                      </Label>
                      <div className="mt-1 flex items-center gap-2">
                        <HexColorField
                          value={heroDraft.ctaBg}
                          onChange={(hex) =>
                            setHeroDraft((prev) => ({ ...prev, ctaBg: hex }))
                          }
                          fallback={DEFAULT_HERO.ctaBg}
                          aria-label="Color de fondo del CTA"
                          className="flex-1 min-w-0"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={
                            toPickerColor(heroDraft.ctaBg) === toPickerColor(DEFAULT_HERO.ctaBg)
                          }
                          onClick={() =>
                            setHeroDraft((prev) => ({
                              ...prev,
                              ctaBg: DEFAULT_HERO.ctaBg,
                            }))
                          }
                          className="shrink-0 border-gold/20 text-carbon/60 hover:text-carbon disabled:opacity-40 h-10"
                          aria-label="Restaurar fondo del CTA"
                        >
                          <RotateCcw className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                    <div>
                      <Label className="text-carbon/60 text-xs uppercase tracking-wider">
                        Color del texto del CTA
                      </Label>
                      <div className="mt-1 flex items-center gap-2">
                        <HexColorField
                          value={heroDraft.ctaTextColor}
                          onChange={(hex) =>
                            setHeroDraft((prev) => ({ ...prev, ctaTextColor: hex }))
                          }
                          fallback={DEFAULT_HERO.ctaTextColor}
                          aria-label="Color del texto del CTA"
                          className="flex-1 min-w-0"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={
                            toPickerColor(heroDraft.ctaTextColor) ===
                            toPickerColor(DEFAULT_HERO.ctaTextColor)
                          }
                          onClick={() =>
                            setHeroDraft((prev) => ({
                              ...prev,
                              ctaTextColor: DEFAULT_HERO.ctaTextColor,
                            }))
                          }
                          className="shrink-0 border-gold/20 text-carbon/60 hover:text-carbon disabled:opacity-40 h-10"
                          aria-label="Restaurar color del texto del CTA"
                        >
                          <RotateCcw className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  </div>

                  <div>
                    <Label className="text-carbon/60 text-xs uppercase tracking-wider">
                      Texto alternativo (accesibilidad)
                    </Label>
                    <Input
                      value={heroDraft.alt}
                      onChange={(e) =>
                        setHeroDraft((prev) => ({ ...prev, alt: e.target.value }))
                      }
                      className="mt-1 border-gold/20 focus-visible:ring-gold/30"
                    />
                  </div>

                  <div>
                    <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                      <Label className="text-carbon/60 text-xs uppercase tracking-wider">
                        Vista previa (escala real · arrastra los textos)
                      </Label>
                      <div className="flex flex-wrap items-center gap-2">
                        <div className="flex rounded-md border border-gold/20 overflow-hidden">
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            onClick={() => setHeroPreviewDevice("desktop")}
                            className={cn(
                              "h-8 gap-1.5 rounded-none px-3 text-xs",
                              heroPreviewDevice === "desktop"
                                ? "bg-gold/15 text-carbon"
                                : "text-carbon/50",
                            )}
                          >
                            <Monitor className="h-3.5 w-3.5" aria-hidden />
                            Escritorio
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            onClick={() => setHeroPreviewDevice("mobile")}
                            className={cn(
                              "h-8 gap-1.5 rounded-none px-3 text-xs",
                              heroPreviewDevice === "mobile"
                                ? "bg-gold/15 text-carbon"
                                : "text-carbon/50",
                            )}
                          >
                            <Smartphone className="h-3.5 w-3.5" aria-hidden />
                            Móvil
                          </Button>
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={
                            heroPreviewDevice === "mobile"
                              ? heroDraft.textPosMobileX === DEFAULT_HERO.textPosMobileX &&
                                heroDraft.textPosMobileY === DEFAULT_HERO.textPosMobileY
                              : heroDraft.textPosX === DEFAULT_HERO.textPosX &&
                                heroDraft.textPosY === DEFAULT_HERO.textPosY
                          }
                          onClick={() =>
                            setHeroDraft((prev) =>
                              heroPreviewDevice === "mobile"
                                ? {
                                    ...prev,
                                    textPosMobileX: DEFAULT_HERO.textPosMobileX,
                                    textPosMobileY: DEFAULT_HERO.textPosMobileY,
                                  }
                                : {
                                    ...prev,
                                    textPosX: DEFAULT_HERO.textPosX,
                                    textPosY: DEFAULT_HERO.textPosY,
                                  },
                            )
                          }
                          className="border-gold/20 text-carbon/60 hover:text-carbon disabled:opacity-40 h-8"
                        >
                          <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
                          Restablecer posición
                        </Button>
                      </div>
                    </div>
                    <div className="-mx-6 border-y border-carbon/10 overflow-hidden">
                      <HeroPreviewFrame device={heroPreviewDevice}>
                        <HeroSection
                          config={heroPreviewConfig}
                          preview
                          previewDevice={heroPreviewDevice}
                          onTextPositionChange={(pos) =>
                            setHeroDraft((prev) =>
                              heroPreviewDevice === "mobile"
                                ? {
                                    ...prev,
                                    textPosMobileX: pos.x,
                                    textPosMobileY: pos.y,
                                  }
                                : {
                                    ...prev,
                                    textPosX: pos.x,
                                    textPosY: pos.y,
                                  },
                            )
                          }
                        />
                      </HeroPreviewFrame>
                    </div>
                    <p className="text-xs text-carbon/35 mt-2">
                      Vista fiel de una pantalla{" "}
                      {heroPreviewDevice === "mobile"
                        ? `${HERO_PREVIEW_VIEWPORT.mobile.width}×${HERO_PREVIEW_VIEWPORT.mobile.height}`
                        : `${HERO_PREVIEW_VIEWPORT.desktop.width}×${HERO_PREVIEW_VIEWPORT.desktop.height}`}
                      : mismo recorte de la foto y misma franja superior tapada por la barra de navegación.
                      La posición del texto se guarda aparte para escritorio y para móvil.
                    </p>
                  </div>
                </>
              )}

              {isWelcomePopup && (
                <>
                  <div className="flex items-center justify-between gap-3 rounded-lg border border-gold/15 bg-cream/40 px-4 py-3">
                    <div>
                      <p className="text-sm font-medium text-carbon">Mostrar popup</p>
                      <p className="text-xs text-carbon/45">
                        Si está desactivado, no aparecerá en la web.
                      </p>
                    </div>
                    <Switch
                      checked={welcomePopupDraft.enabled}
                      onCheckedChange={(v) =>
                        setWelcomePopupDraft((prev) => ({ ...prev, enabled: v }))
                      }
                    />
                  </div>

                  <div>
                    <Label className="text-carbon/60 text-xs uppercase tracking-wider">
                      Imagen de fondo
                    </Label>
                    <input
                      ref={welcomePopupInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        e.target.value = "";
                        if (file) beginWelcomePopupCrop(file);
                      }}
                    />
                    <div
                      role="button"
                      tabIndex={0}
                      onClick={() => {
                        if (welcomePopupUploading) return;
                        welcomePopupInputRef.current?.click();
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          if (!welcomePopupUploading) welcomePopupInputRef.current?.click();
                        }
                      }}
                      onDragEnter={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setWelcomePopupDragOver(true);
                      }}
                      onDragOver={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setWelcomePopupDragOver(true);
                      }}
                      onDragLeave={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setWelcomePopupDragOver(false);
                      }}
                      onDrop={handleWelcomePopupDrop}
                      className={cn(
                        "relative mt-2 cursor-pointer overflow-hidden rounded-xl border-2 border-dashed transition-all duration-200",
                        welcomePopupDragOver
                          ? "border-gold bg-gold/5 scale-[1.01]"
                          : "border-gold/20 hover:border-gold/40",
                        welcomePopupDraft.imageUrl
                          ? "mx-auto aspect-[9/16] max-w-[220px] bg-muted"
                          : "min-h-36 bg-muted/40",
                      )}
                    >
                      {welcomePopupUploading && (
                        <div className="absolute inset-0 z-10 flex items-center justify-center bg-carbon/40">
                          <Loader2 className="h-7 w-7 animate-spin text-white" />
                        </div>
                      )}
                      {welcomePopupDraft.imageUrl ? (
                        <img
                          src={welcomePopupDraft.imageUrl}
                          alt="Vista previa popup"
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full min-h-36 flex-col items-center justify-center gap-2 px-4 py-8 text-carbon/40">
                          <Upload className="h-8 w-8" />
                          <span className="text-sm text-center">
                            Arrastra una imagen o haz clic (vertical)
                          </span>
                        </div>
                      )}
                    </div>
                    {welcomePopupDraft.imageUrl ? (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="mt-2 border-gold/20"
                        onClick={() =>
                          setWelcomePopupDraft((prev) => ({ ...prev, imageUrl: "" }))
                        }
                      >
                        <Trash2 className="h-3.5 w-3.5 mr-1.5" />
                        Quitar imagen
                      </Button>
                    ) : null}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <Label className="text-carbon/60 text-xs uppercase tracking-wider">
                        Antetítulo
                      </Label>
                      <Input
                        value={welcomePopupDraft.eyebrow}
                        onChange={(e) =>
                          setWelcomePopupDraft((prev) => ({ ...prev, eyebrow: e.target.value }))
                        }
                        className="mt-1 border-gold/20"
                      />
                    </div>
                    <div>
                      <Label className="text-carbon/60 text-xs uppercase tracking-wider">
                        Importe (display)
                      </Label>
                      <Input
                        value={welcomePopupDraft.offerAmount}
                        onChange={(e) =>
                          setWelcomePopupDraft((prev) => ({
                            ...prev,
                            offerAmount: e.target.value,
                          }))
                        }
                        className="mt-1 border-gold/20"
                        placeholder="10€"
                      />
                    </div>
                    <div>
                      <Label className="text-carbon/60 text-xs uppercase tracking-wider">
                        Sufijo oferta
                      </Label>
                      <Input
                        value={welcomePopupDraft.offerSuffix}
                        onChange={(e) =>
                          setWelcomePopupDraft((prev) => ({
                            ...prev,
                            offerSuffix: e.target.value,
                          }))
                        }
                        className="mt-1 border-gold/20"
                      />
                    </div>
                    <div>
                      <Label className="text-carbon/60 text-xs uppercase tracking-wider">
                        Badge
                      </Label>
                      <Input
                        value={welcomePopupDraft.badgeText}
                        onChange={(e) =>
                          setWelcomePopupDraft((prev) => ({ ...prev, badgeText: e.target.value }))
                        }
                        className="mt-1 border-gold/20"
                      />
                    </div>
                    <div>
                      <Label className="text-carbon/60 text-xs uppercase tracking-wider">
                        CTA principal
                      </Label>
                      <Input
                        value={welcomePopupDraft.primaryCta}
                        onChange={(e) =>
                          setWelcomePopupDraft((prev) => ({
                            ...prev,
                            primaryCta: e.target.value,
                          }))
                        }
                        className="mt-1 border-gold/20"
                      />
                    </div>
                    <div>
                      <Label className="text-carbon/60 text-xs uppercase tracking-wider">
                        CTA secundario
                      </Label>
                      <Input
                        value={welcomePopupDraft.secondaryCta}
                        onChange={(e) =>
                          setWelcomePopupDraft((prev) => ({
                            ...prev,
                            secondaryCta: e.target.value,
                          }))
                        }
                        className="mt-1 border-gold/20"
                      />
                    </div>
                  </div>

                  <div className="border-t border-gold/10 pt-4 space-y-4">
                    <p className="text-xs uppercase tracking-wider text-carbon/45">
                      Pantalla email
                    </p>
                    <div>
                      <Label className="text-carbon/60 text-xs uppercase tracking-wider">
                        Título
                      </Label>
                      <Input
                        value={welcomePopupDraft.emailTitle}
                        onChange={(e) =>
                          setWelcomePopupDraft((prev) => ({
                            ...prev,
                            emailTitle: e.target.value,
                          }))
                        }
                        className="mt-1 border-gold/20"
                      />
                    </div>
                    <div>
                      <Label className="text-carbon/60 text-xs uppercase tracking-wider">
                        Descripción
                      </Label>
                      <Textarea
                        value={welcomePopupDraft.emailDescription}
                        onChange={(e) =>
                          setWelcomePopupDraft((prev) => ({
                            ...prev,
                            emailDescription: e.target.value,
                          }))
                        }
                        className="mt-1 border-gold/20 min-h-[80px]"
                      />
                    </div>
                    <div>
                      <Label className="text-carbon/60 text-xs uppercase tracking-wider">
                        Botón suscribir
                      </Label>
                      <Input
                        value={welcomePopupDraft.emailCta}
                        onChange={(e) =>
                          setWelcomePopupDraft((prev) => ({ ...prev, emailCta: e.target.value }))
                        }
                        className="mt-1 border-gold/20"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <Label className="text-carbon/60 text-xs uppercase tracking-wider">
                        Color rosa
                      </Label>
                      <div className="mt-1">
                        <HexColorField
                          value={welcomePopupDraft.pink}
                          onChange={(hex) =>
                            setWelcomePopupDraft((prev) => ({ ...prev, pink: hex }))
                          }
                          fallback={DEFAULT_WELCOME_POPUP.pink}
                          aria-label="Color rosa del popup"
                        />
                      </div>
                    </div>
                    <div>
                      <Label className="text-carbon/60 text-xs uppercase tracking-wider">
                        Color oro
                      </Label>
                      <div className="mt-1">
                        <HexColorField
                          value={welcomePopupDraft.gold}
                          onChange={(hex) =>
                            setWelcomePopupDraft((prev) => ({ ...prev, gold: hex }))
                          }
                          fallback={DEFAULT_WELCOME_POPUP.gold}
                          aria-label="Color oro del popup"
                        />
                      </div>
                    </div>
                    <div>
                      <Label className="text-carbon/60 text-xs uppercase tracking-wider">
                        Delay (ms)
                      </Label>
                      <Input
                        type="text"
                        inputMode="numeric"
                        value={String(welcomePopupDraft.delayMs)}
                        onChange={(e) => {
                          const next = e.target.value.replace(/[^\d]/g, "");
                          setWelcomePopupDraft((prev) => ({
                            ...prev,
                            delayMs: next === "" ? 0 : Number(next),
                          }));
                        }}
                        className="mt-1 border-gold/20"
                      />
                    </div>
                  </div>

                  <div className="flex flex-wrap items-start justify-center gap-4">
                    <div
                      className="w-full max-w-[220px] overflow-hidden rounded-2xl border border-gold/15 shadow-sm"
                      style={{
                        backgroundColor: "#E8DFD0",
                        backgroundImage: welcomePopupDraft.imageUrl
                          ? `url(${welcomePopupDraft.imageUrl})`
                          : undefined,
                        backgroundSize: "cover",
                        backgroundPosition: "center",
                      }}
                    >
                      <div className="bg-gradient-to-b from-white/70 via-white/30 to-black/20 px-4 py-6 text-center min-h-[280px] flex flex-col items-center">
                        <p className="font-sans text-[0.55rem] font-semibold uppercase tracking-[0.22em] text-carbon/80">
                          {welcomePopupDraft.eyebrow || DEFAULT_WELCOME_POPUP.eyebrow}
                        </p>
                        <p
                          className="mt-1 font-playfair text-4xl font-bold leading-none tracking-tight"
                          style={{
                            backgroundImage: `linear-gradient(180deg, #E8D5A3 0%, ${welcomePopupDraft.gold || DEFAULT_WELCOME_POPUP.gold} 45%, #8B6914 100%)`,
                            WebkitBackgroundClip: "text",
                            backgroundClip: "text",
                            color: "transparent",
                          }}
                        >
                          {welcomePopupDraft.offerAmount || DEFAULT_WELCOME_POPUP.offerAmount}
                        </p>
                        <p className="mt-1 font-playfair text-[0.7rem] font-semibold uppercase tracking-[0.12em] text-carbon/85">
                          {welcomePopupDraft.offerSuffix || DEFAULT_WELCOME_POPUP.offerSuffix}
                        </p>
                        <div className="my-2.5 flex w-full max-w-[7rem] items-center gap-1.5">
                          <span
                            className="h-px flex-1"
                            style={{
                              backgroundColor:
                                welcomePopupDraft.gold || DEFAULT_WELCOME_POPUP.gold,
                            }}
                          />
                          <Sparkle
                            className="h-2.5 w-2.5"
                            style={{
                              color: welcomePopupDraft.gold || DEFAULT_WELCOME_POPUP.gold,
                            }}
                            fill={welcomePopupDraft.gold || DEFAULT_WELCOME_POPUP.gold}
                          />
                          <span
                            className="h-px flex-1"
                            style={{
                              backgroundColor:
                                welcomePopupDraft.gold || DEFAULT_WELCOME_POPUP.gold,
                            }}
                          />
                        </div>
                        <p className="font-playfair text-[0.6rem] font-semibold uppercase tracking-[0.12em] text-carbon/85">
                          {welcomePopupDraft.badgeText || DEFAULT_WELCOME_POPUP.badgeText}
                        </p>
                        <div className="mt-auto w-full space-y-1.5 pt-8">
                          <div
                            className="flex items-center justify-center gap-1 rounded-full border border-white/70 py-2 text-[0.6rem] font-bold uppercase tracking-wider text-white shadow-sm"
                            style={{
                              background: `linear-gradient(90deg, ${welcomePopupDraft.pink || DEFAULT_WELCOME_POPUP.pink} 0%, #F0A0AB 50%, ${welcomePopupDraft.pink || DEFAULT_WELCOME_POPUP.pink} 100%)`,
                            }}
                          >
                            <Sparkle className="h-2.5 w-2.5" fill="currentColor" />
                            {welcomePopupDraft.primaryCta || DEFAULT_WELCOME_POPUP.primaryCta}
                            <Sparkle className="h-2.5 w-2.5" fill="currentColor" />
                          </div>
                          <div
                            className="rounded-full border py-1.5 text-[0.55rem] font-semibold uppercase tracking-wider text-carbon/80"
                            style={{
                              borderColor: `${welcomePopupDraft.gold || DEFAULT_WELCOME_POPUP.gold}99`,
                              backgroundColor: "rgba(249,247,242,0.55)",
                            }}
                          >
                            {welcomePopupDraft.secondaryCta || DEFAULT_WELCOME_POPUP.secondaryCta}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div
                      className="w-full max-w-[220px] overflow-hidden rounded-2xl border border-gold/15 shadow-sm"
                      style={{
                        backgroundColor: "#E8DFD0",
                        backgroundImage: welcomePopupDraft.imageUrl
                          ? `url(${welcomePopupDraft.imageUrl})`
                          : undefined,
                        backgroundSize: "cover",
                        backgroundPosition: "center",
                      }}
                    >
                      <div className="flex min-h-[280px] flex-col bg-gradient-to-b from-white/70 via-white/30 to-black/20 px-4 py-6">
                        <p className="text-center font-playfair text-base font-bold text-carbon">
                          {welcomePopupDraft.emailTitle || DEFAULT_WELCOME_POPUP.emailTitle}
                        </p>
                        <p className="mt-1.5 text-center text-[0.65rem] leading-snug text-carbon/70">
                          {welcomePopupDraft.emailDescription ||
                            DEFAULT_WELCOME_POPUP.emailDescription}
                        </p>
                        <div className="mt-4 space-y-2.5 rounded-xl bg-white/85 p-2.5">
                          <div className="rounded-md border border-gold/30 bg-white px-2 py-1.5 text-[0.6rem] text-carbon/40">
                            tu@email.com
                          </div>
                          <div className="flex items-start gap-1.5 text-[0.55rem] leading-relaxed text-carbon/70">
                            <span className="mt-0.5 h-2.5 w-2.5 shrink-0 rounded-sm border border-carbon/40" />
                            <span>
                              Acepto la política de privacidad y doy mi consentimiento para
                              recibir la newsletter.
                            </span>
                          </div>
                        </div>
                        <div className="mt-auto w-full space-y-1.5 pt-6">
                          <div
                            className="rounded-full border border-white/70 py-2 text-center text-[0.6rem] font-bold uppercase tracking-wider text-white shadow-sm"
                            style={{
                              background: `linear-gradient(90deg, ${welcomePopupDraft.pink || DEFAULT_WELCOME_POPUP.pink} 0%, #F0A0AB 50%, ${welcomePopupDraft.pink || DEFAULT_WELCOME_POPUP.pink} 100%)`,
                            }}
                          >
                            {welcomePopupDraft.emailCta || DEFAULT_WELCOME_POPUP.emailCta}
                          </div>
                          <div
                            className="rounded-full border py-1.5 text-center text-[0.55rem] font-semibold uppercase tracking-wider text-carbon/80"
                            style={{
                              borderColor: `${welcomePopupDraft.gold || DEFAULT_WELCOME_POPUP.gold}99`,
                              backgroundColor: "rgba(249,247,242,0.55)",
                            }}
                          >
                            Volver
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </>
              )}

              {isCampaign && (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label className="text-carbon/60 text-xs uppercase tracking-wider">
                        Imagen escritorio / tablet
                      </Label>
                      <input
                        ref={desktopInputRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          e.target.value = "";
                          if (file) beginCampaignCrop(file, "desktop");
                        }}
                      />
                      <div
                        role="button"
                        tabIndex={0}
                        onClick={() => {
                          if (campaignUploading) return;
                          desktopInputRef.current?.click();
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            if (!campaignUploading) desktopInputRef.current?.click();
                          }
                        }}
                        onDragEnter={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setCampaignDragOver("desktop");
                        }}
                        onDragOver={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setCampaignDragOver("desktop");
                        }}
                        onDragLeave={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setCampaignDragOver((prev) => (prev === "desktop" ? null : prev));
                        }}
                        onDrop={(e) => handleCampaignDrop(e, "desktop")}
                        className={cn(
                          "relative mt-2 cursor-pointer overflow-hidden rounded-xl border-2 border-dashed transition-all duration-200",
                          campaignDragOver === "desktop"
                            ? "border-gold bg-gold/5 scale-[1.01]"
                            : "border-gold/20 hover:border-gold/40",
                          campaignDraft.desktopImageUrl ? "aspect-video bg-muted" : "min-h-36 bg-muted/40",
                        )}
                      >
                        {campaignUploading === "desktop" && (
                          <div className="absolute inset-0 z-10 flex items-center justify-center bg-carbon/40">
                            <Loader2 className="h-7 w-7 animate-spin text-white" />
                          </div>
                        )}
                        {campaignDraft.desktopImageUrl ? (
                          <img
                            src={campaignDraft.desktopImageUrl}
                            alt="Vista previa escritorio"
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="flex h-full min-h-36 flex-col items-center justify-center gap-2 px-4 py-8 text-carbon/40">
                            <Upload className="h-8 w-8" />
                            <span className="text-sm text-center">Arrastra una imagen o haz clic</span>
                          </div>
                        )}
                        {campaignDraft.desktopImageUrl && campaignUploading !== "desktop" && (
                          <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-carbon/0 opacity-0 transition-opacity hover:bg-carbon/30 hover:opacity-100">
                            <span className="rounded-lg bg-carbon/60 px-3 py-1.5 text-xs text-white">
                              Cambiar imagen
                            </span>
                          </div>
                        )}
                      </div>
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        {campaignDraft.desktopImageUrl && (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              setCampaignDraft((prev) => ({ ...prev, desktopImageUrl: "" }))
                            }
                            className="border-gold/20 text-carbon/60"
                          >
                            <Trash2 className="h-3.5 w-3.5 mr-1.5" />
                            Quitar
                          </Button>
                        )}
                        <p className="text-xs text-carbon/30">
                          Obligatoria para mostrar la sección en la web.
                        </p>
                      </div>
                    </div>

                    <div>
                      <Label className="text-carbon/60 text-xs uppercase tracking-wider">
                        Imagen móvil
                      </Label>
                      <input
                        ref={mobileInputRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          e.target.value = "";
                          if (file) beginCampaignCrop(file, "mobile");
                        }}
                      />
                      <div
                        role="button"
                        tabIndex={0}
                        onClick={() => {
                          if (campaignUploading) return;
                          mobileInputRef.current?.click();
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            if (!campaignUploading) mobileInputRef.current?.click();
                          }
                        }}
                        onDragEnter={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setCampaignDragOver("mobile");
                        }}
                        onDragOver={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setCampaignDragOver("mobile");
                        }}
                        onDragLeave={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setCampaignDragOver((prev) => (prev === "mobile" ? null : prev));
                        }}
                        onDrop={(e) => handleCampaignDrop(e, "mobile")}
                        className={cn(
                          "relative mt-2 cursor-pointer overflow-hidden rounded-xl border-2 border-dashed transition-all duration-200",
                          campaignDragOver === "mobile"
                            ? "border-gold bg-gold/5 scale-[1.01]"
                            : "border-gold/20 hover:border-gold/40",
                          campaignDraft.mobileImageUrl ? "aspect-3/4 max-h-56 bg-muted" : "min-h-36 bg-muted/40",
                        )}
                      >
                        {campaignUploading === "mobile" && (
                          <div className="absolute inset-0 z-10 flex items-center justify-center bg-carbon/40">
                            <Loader2 className="h-7 w-7 animate-spin text-white" />
                          </div>
                        )}
                        {campaignDraft.mobileImageUrl ? (
                          <img
                            src={campaignDraft.mobileImageUrl}
                            alt="Vista previa móvil"
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="flex h-full min-h-36 flex-col items-center justify-center gap-2 px-4 py-8 text-carbon/40">
                            <Upload className="h-8 w-8" />
                            <span className="text-sm text-center">Arrastra una imagen o haz clic</span>
                          </div>
                        )}
                        {campaignDraft.mobileImageUrl && campaignUploading !== "mobile" && (
                          <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-carbon/0 opacity-0 transition-opacity hover:bg-carbon/30 hover:opacity-100">
                            <span className="rounded-lg bg-carbon/60 px-3 py-1.5 text-xs text-white">
                              Cambiar imagen
                            </span>
                          </div>
                        )}
                      </div>
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        {campaignDraft.mobileImageUrl && (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              setCampaignDraft((prev) => ({ ...prev, mobileImageUrl: "" }))
                            }
                            className="border-gold/20 text-carbon/60"
                          >
                            <Trash2 className="h-3.5 w-3.5 mr-1.5" />
                            Quitar
                          </Button>
                        )}
                        <p className="text-xs text-carbon/30">
                          Opcional; si falta se usa la de escritorio.
                        </p>
                      </div>
                    </div>
                  </div>

                  <p className="text-xs text-carbon/30">
                    Tras elegir la imagen podrás recortar la zona visible. Se convierte a WebP
                    (máx. 1920px escritorio / 1080px móvil).
                  </p>

                  <div>
                    <Label className="text-carbon/60 text-xs uppercase tracking-wider">
                      Titular
                    </Label>
                    <Input
                      value={campaignDraft.headline}
                      onChange={(e) =>
                        setCampaignDraft((prev) => ({ ...prev, headline: e.target.value }))
                      }
                      className="mt-1 border-gold/20 focus-visible:ring-gold/30"
                    />
                  </div>

                  <div>
                    <Label className="text-carbon/60 text-xs uppercase tracking-wider">
                      Color del titular
                    </Label>
                    <div className="mt-1 flex items-center gap-2">
                      <HexColorField
                        value={campaignDraft.headlineColor}
                        onChange={(hex) =>
                          setCampaignDraft((prev) => ({ ...prev, headlineColor: hex }))
                        }
                        fallback={DEFAULT_CAMPAIGN.headlineColor}
                        aria-label="Color del titular de campaña"
                        className="flex-1 min-w-0"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={
                          toPickerColor(campaignDraft.headlineColor) ===
                          toPickerColor(DEFAULT_CAMPAIGN.headlineColor)
                        }
                        onClick={() =>
                          setCampaignDraft((prev) => ({
                            ...prev,
                            headlineColor: DEFAULT_CAMPAIGN.headlineColor,
                          }))
                        }
                        className="shrink-0 border-gold/20 text-carbon/60 hover:text-carbon disabled:opacity-40 h-10"
                        aria-label="Restaurar color del titular"
                      >
                        <RotateCcw className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>

                  <div>
                    <Label className="text-carbon/60 text-xs uppercase tracking-wider">
                      Subtítulo
                    </Label>
                    <Input
                      value={campaignDraft.subheadline}
                      onChange={(e) =>
                        setCampaignDraft((prev) => ({ ...prev, subheadline: e.target.value }))
                      }
                      className="mt-1 border-gold/20 focus-visible:ring-gold/30"
                    />
                  </div>

                  <div>
                    <Label className="text-carbon/60 text-xs uppercase tracking-wider">
                      Texto en color de acento
                    </Label>
                    <Input
                      value={campaignDraft.subheadlineAccent}
                      onChange={(e) =>
                        setCampaignDraft((prev) => ({
                          ...prev,
                          subheadlineAccent: e.target.value,
                        }))
                      }
                      className="mt-1 border-gold/20 focus-visible:ring-gold/30"
                      placeholder="estaba esperando."
                    />
                    <p className="text-xs text-carbon/30 mt-1">
                      Debe coincidir con un fragmento del subtítulo.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <Label className="text-carbon/60 text-xs uppercase tracking-wider">
                        Color del subtítulo
                      </Label>
                      <div className="mt-1 flex items-center gap-2">
                        <HexColorField
                          value={campaignDraft.subheadlineColor}
                          onChange={(hex) =>
                            setCampaignDraft((prev) => ({ ...prev, subheadlineColor: hex }))
                          }
                          fallback={DEFAULT_CAMPAIGN.subheadlineColor}
                          aria-label="Color del subtítulo"
                          className="flex-1 min-w-0"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={
                            toPickerColor(campaignDraft.subheadlineColor) ===
                            toPickerColor(DEFAULT_CAMPAIGN.subheadlineColor)
                          }
                          onClick={() =>
                            setCampaignDraft((prev) => ({
                              ...prev,
                              subheadlineColor: DEFAULT_CAMPAIGN.subheadlineColor,
                            }))
                          }
                          className="shrink-0 border-gold/20 text-carbon/60 hover:text-carbon disabled:opacity-40 h-10"
                          aria-label="Restaurar color del subtítulo"
                        >
                          <RotateCcw className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>

                    <div>
                      <Label className="text-carbon/60 text-xs uppercase tracking-wider">
                        Color de acento
                      </Label>
                      <div className="mt-1 flex items-center gap-2">
                        <HexColorField
                          value={campaignDraft.subheadlineAccentColor}
                          onChange={(hex) =>
                            setCampaignDraft((prev) => ({
                              ...prev,
                              subheadlineAccentColor: hex,
                            }))
                          }
                          fallback={DEFAULT_CAMPAIGN.subheadlineAccentColor}
                          aria-label="Color de acento del subtítulo"
                          className="flex-1 min-w-0"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={
                            toPickerColor(campaignDraft.subheadlineAccentColor) ===
                            toPickerColor(DEFAULT_CAMPAIGN.subheadlineAccentColor)
                          }
                          onClick={() =>
                            setCampaignDraft((prev) => ({
                              ...prev,
                              subheadlineAccentColor: DEFAULT_CAMPAIGN.subheadlineAccentColor,
                            }))
                          }
                          className="shrink-0 border-gold/20 text-carbon/60 hover:text-carbon disabled:opacity-40 h-10"
                          aria-label="Restaurar color de acento"
                        >
                          <RotateCcw className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>

                    <div>
                      <Label className="text-carbon/60 text-xs uppercase tracking-wider">
                        Color del separador
                      </Label>
                      <div className="mt-1 flex items-center gap-2">
                        <HexColorField
                          value={campaignDraft.dividerColor}
                          onChange={(hex) =>
                            setCampaignDraft((prev) => ({ ...prev, dividerColor: hex }))
                          }
                          fallback={DEFAULT_CAMPAIGN.dividerColor}
                          aria-label="Color del separador"
                          className="flex-1 min-w-0"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={
                            toPickerColor(campaignDraft.dividerColor) ===
                            toPickerColor(DEFAULT_CAMPAIGN.dividerColor)
                          }
                          onClick={() =>
                            setCampaignDraft((prev) => ({
                              ...prev,
                              dividerColor: DEFAULT_CAMPAIGN.dividerColor,
                            }))
                          }
                          className="shrink-0 border-gold/20 text-carbon/60 hover:text-carbon disabled:opacity-40 h-10"
                          aria-label="Restaurar color del separador"
                        >
                          <RotateCcw className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  </div>

                  <div>
                    <Label className="text-carbon/60 text-xs uppercase tracking-wider">
                      Texto alternativo (accesibilidad)
                    </Label>
                    <Input
                      value={campaignDraft.alt}
                      onChange={(e) =>
                        setCampaignDraft((prev) => ({ ...prev, alt: e.target.value }))
                      }
                      className="mt-1 border-gold/20 focus-visible:ring-gold/30"
                    />
                  </div>

                  <div>
                    <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                      <Label className="text-carbon/60 text-xs uppercase tracking-wider">
                        Vista previa (escala real · arrastra los textos)
                      </Label>
                      <div className="flex flex-wrap items-center gap-2">
                        <div className="flex rounded-md border border-gold/20 overflow-hidden">
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            onClick={() => setCampaignPreviewDevice("desktop")}
                            className={cn(
                              "h-8 gap-1.5 rounded-none px-3 text-xs",
                              campaignPreviewDevice === "desktop"
                                ? "bg-gold/15 text-carbon"
                                : "text-carbon/50",
                            )}
                          >
                            <Monitor className="h-3.5 w-3.5" aria-hidden />
                            Escritorio
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            onClick={() => setCampaignPreviewDevice("mobile")}
                            className={cn(
                              "h-8 gap-1.5 rounded-none px-3 text-xs",
                              campaignPreviewDevice === "mobile"
                                ? "bg-gold/15 text-carbon"
                                : "text-carbon/50",
                            )}
                          >
                            <Smartphone className="h-3.5 w-3.5" aria-hidden />
                            Móvil
                          </Button>
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={
                            campaignPreviewDevice === "mobile"
                              ? campaignDraft.textPosMobileX ===
                                  DEFAULT_CAMPAIGN.textPosMobileX &&
                                campaignDraft.textPosMobileY ===
                                  DEFAULT_CAMPAIGN.textPosMobileY
                              : campaignDraft.textPosX === DEFAULT_CAMPAIGN.textPosX &&
                                campaignDraft.textPosY === DEFAULT_CAMPAIGN.textPosY
                          }
                          onClick={() =>
                            setCampaignDraft((prev) =>
                              campaignPreviewDevice === "mobile"
                                ? {
                                    ...prev,
                                    textPosMobileX: DEFAULT_CAMPAIGN.textPosMobileX,
                                    textPosMobileY: DEFAULT_CAMPAIGN.textPosMobileY,
                                  }
                                : {
                                    ...prev,
                                    textPosX: DEFAULT_CAMPAIGN.textPosX,
                                    textPosY: DEFAULT_CAMPAIGN.textPosY,
                                  },
                            )
                          }
                          className="border-gold/20 text-carbon/60 hover:text-carbon disabled:opacity-40 h-8"
                        >
                          <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
                          Restablecer posición
                        </Button>
                      </div>
                    </div>
                    <div className="-mx-6 border-y border-carbon/10 overflow-hidden">
                      <CampaignPreviewFrame device={campaignPreviewDevice}>
                        <CampaignBanner
                          config={campaignPreviewConfig}
                          preview
                          previewDevice={campaignPreviewDevice}
                          onTextPositionChange={(pos) =>
                            setCampaignDraft((prev) =>
                              campaignPreviewDevice === "mobile"
                                ? {
                                    ...prev,
                                    textPosMobileX: pos.x,
                                    textPosMobileY: pos.y,
                                  }
                                : {
                                    ...prev,
                                    textPosX: pos.x,
                                    textPosY: pos.y,
                                  },
                            )
                          }
                        />
                      </CampaignPreviewFrame>
                    </div>
                    <p className="text-xs text-carbon/35 mt-2">
                      Vista fiel de{" "}
                      {campaignPreviewDevice === "mobile"
                        ? `móvil (${CAMPAIGN_PREVIEW_VIEWPORT.mobile.width}px, ratio 4:5)`
                        : `escritorio (${CAMPAIGN_PREVIEW_VIEWPORT.desktop.width}px, ratio 21:9 · máx. 720px de alto)`}
                      : misma tipografía, imagen y proporción que en la web. Las bandas laterales
                      marcan el ancho real del dispositivo; la posición del texto se guarda aparte
                      para escritorio y para móvil.
                    </p>
                  </div>
                </>
              )}

              {!isHeadline && !isCampaign && !isHero && !isWelcomePopup && (
                <div>
                  <Label className="text-carbon/60 text-xs uppercase tracking-wider">
                    {isMarquee ? "Textos (uno por línea)" : "Contenido"}
                  </Label>
                  <Textarea
                    value={isMarquee ? marqueeDraft.texts : block.content}
                    onChange={(e) => {
                      if (isMarquee) {
                        setMarqueeDraft((prev) => ({ ...prev, texts: e.target.value }));
                      } else {
                        updateField(block.key, "content", e.target.value);
                      }
                    }}
                    rows={isMarquee ? 8 : 4}
                    className="mt-1 border-gold/20 focus-visible:ring-gold/30 font-sans"
                  />
                  <p className="text-xs text-carbon/30 mt-1">
                    {isMarquee
                      ? "Cada línea es un texto de la marquesina en movimiento."
                      : "Separa los párrafos con líneas en blanco."}
                  </p>
                </div>
              )}

              {isMarquee && (
                <div
                  className="rounded-lg border border-carbon/10 overflow-hidden"
                  style={{
                    backgroundColor: marqueeDraft.background,
                    paddingTop: parsePaddingY(marqueeDraft.paddingY),
                    paddingBottom: parsePaddingY(marqueeDraft.paddingY),
                  }}
                >
                  <p className="px-4 text-center font-sans text-[0.65rem] font-medium uppercase tracking-[0.28em] text-carbon/70">
                    Vista previa · {marqueeTextToItems(marqueeDraft.texts)[0] || "…"}
                  </p>
                </div>
              )}

              <div className="flex items-center gap-2">
                <Button
                  onClick={() => saveBlock(block)}
                  disabled={!dirty || saving === block.key}
                  className="bg-gold hover:bg-gold/90 text-white disabled:opacity-40"
                  size="sm"
                >
                  {saving === block.key ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                  ) : (
                    <Save className="h-3.5 w-3.5 mr-1.5" />
                  )}
                  Guardar
                </Button>
                {isWelcomePopup && (
                  <>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setWelcomePopupPreviewOpen(true)}
                      className="border-gold/30 text-carbon hover:bg-gold/10"
                    >
                      <Play className="h-3.5 w-3.5 mr-1.5" />
                      Probar
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setWelcomePopupDraft((prev) => ({
                          ...DEFAULT_WELCOME_POPUP,
                          enabled: prev.enabled,
                          imageUrl: prev.imageUrl,
                        }));
                        toast({
                          title: "Diseño restablecido",
                          description:
                            "Textos y colores vuelven a la versión por defecto. Guarda para aplicar.",
                        });
                      }}
                      className="border-gold/30 text-carbon/70 hover:bg-gold/10 hover:text-carbon"
                    >
                      <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
                      Restablecer diseño
                    </Button>
                  </>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>

    <ProductImageCropDialog
      open={campaignCropOpen}
      imageSrc={campaignCropSrc}
      onOpenChange={handleCampaignCropOpenChange}
      aspect={campaignCropVariant === "desktop" ? CAMPAIGN_DESKTOP_ASPECT : CAMPAIGN_MOBILE_ASPECT}
      maxOutputSize={campaignCropVariant === "desktop" ? 1920 : 1080}
      title={
        campaignCropVariant === "desktop"
          ? "Recortar imagen · Escritorio / tablet"
          : "Recortar imagen · Móvil"
      }
      onCropped={async (file) => {
        await uploadCampaignImage(file, campaignCropVariant);
      }}
    />
    <ProductImageCropDialog
      open={heroCropOpen}
      imageSrc={heroCropSrc}
      onOpenChange={handleHeroCropOpenChange}
      aspect={heroCropVariant === "desktop" ? HERO_DESKTOP_ASPECT : HERO_MOBILE_ASPECT}
      maxOutputSize={heroCropVariant === "desktop" ? 1920 : 1080}
      title={
        heroCropVariant === "desktop"
          ? "Recortar imagen · Hero escritorio/tablet"
          : "Recortar imagen · Hero móvil"
      }
      onCropped={async (file) => {
        await uploadHeroImage(file, heroCropVariant);
      }}
    />
    <ProductImageCropDialog
      open={welcomePopupCropOpen}
      imageSrc={welcomePopupCropSrc}
      onOpenChange={handleWelcomePopupCropOpenChange}
      aspect={WELCOME_POPUP_ASPECT}
      maxOutputSize={1080}
      title="Recortar imagen · Popup bienvenida"
      onCropped={async (file) => {
        await uploadWelcomePopupImage(file);
      }}
    />
    <WelcomePromoDialogView
      preview
      open={welcomePopupPreviewOpen}
      onOpenChange={setWelcomePopupPreviewOpen}
      config={buildWelcomePopupPayload().config}
    />
  </>
  );
};

export default AdminContentEditor;

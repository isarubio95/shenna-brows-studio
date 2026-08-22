import { useEffect, useRef, useState, type DragEvent } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Monitor, Play, Plus, RotateCcw, Save, Smartphone, Sparkle, Trash2, Upload } from "lucide-react";
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
  campaignCtaPath,
  type CampaignConfig,
} from "@/lib/campaign-content";
import {
  DEFAULT_HERO,
  parseHeroConfig,
  serializeHeroConfig,
  type HeroConfig,
} from "@/lib/hero-content";
import {
  DEFAULT_TIENDA_HERO,
  parseTiendaHeroConfig,
  serializeTiendaHeroConfig,
  TIENDA_HERO_ICON_IDS,
  TIENDA_HERO_ICON_LABELS,
  type TiendaHeroConfig,
  type TiendaHeroIconId,
} from "@/lib/tienda-hero-content";
import {
  DEFAULT_WELCOME_POPUP,
  parseWelcomePopupConfig,
  serializeWelcomePopupConfig,
  type WelcomePopupConfig,
} from "@/lib/welcome-popup-content";
import {
  DEFAULT_SALE_BADGE,
  DEFAULT_SITE_BADGES,
  parseSiteBadgesConfig,
  serializeSiteBadgesConfig,
  type SiteBadgesConfig,
} from "@/lib/badges-content";
import {
  DEFAULT_WHATSAPP_BUTTON,
  parseWhatsAppButtonConfig,
  serializeWhatsAppButtonConfig,
  type WhatsAppButtonConfig,
} from "@/lib/whatsapp-content";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { WelcomePromoDialogView } from "@/components/WelcomePromoDialog";
import TiendaHero, { type TiendaHeroPreviewDevice } from "@/components/TiendaHero";
import { SaleBadgeChip } from "@/components/ProductSaleBadge";
import { WhatsAppButtonView } from "@/components/WhatsAppFloatingButton";
import { cn } from "@/lib/utils";

const CAMPAIGN_BUCKET = "campaign-images";
const CAMPAIGN_CTA_TIENDA_VALUE = "__tienda__";

type CampaignProductOption = {
  id: string;
  name: string;
  slug: string;
  category: string | null;
};
const SUPABASE_URL = "https://vanhsuisvxvclxdgutaw.supabase.co";
/** Proporción real del banner de tienda (1600×961, incluye degradé inferior). */
const TIENDA_HERO_DESKTOP_ASPECT = 1600 / 961;
const TIENDA_HERO_MOBILE_ASPECT = 9 / 16;
/** Coincide con el banner de la home (md+). */
const CAMPAIGN_DESKTOP_ASPECT = 21 / 9;
/** Coincide con el banner de la home en móvil. */
const CAMPAIGN_MOBILE_ASPECT = 4 / 5;
/** Hero de tienda: incluye el degradé blanco inferior (1600×961). */
const TIENDA_HERO_ASPECT = 1600 / 961;
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
  tienda_hero: "Hero — Página de tienda",
  site_badges: "Badge de oferta — Productos",
  whatsapp_button: "Botón de WhatsApp — Flotante",
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
  "tienda_hero",
  "site_badges",
  "whatsapp_button",
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

const AdminColorField = ({
  label,
  value,
  fallback,
  onChange,
  ariaLabel,
}: {
  label: string;
  value: string;
  fallback: string;
  onChange: (hex: string) => void;
  ariaLabel: string;
}) => (
  <div>
    <Label className="text-carbon/60 text-xs uppercase tracking-wider">{label}</Label>
    <div className="mt-1 flex items-center gap-2">
      <HexColorField
        value={value}
        onChange={onChange}
        fallback={fallback}
        aria-label={ariaLabel}
        className="flex-1 min-w-0"
      />
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={toPickerColor(value) === toPickerColor(fallback)}
        onClick={() => onChange(fallback)}
        className="shrink-0 border-gold/20 text-carbon/60 hover:text-carbon disabled:opacity-40 h-10"
        aria-label={`Restaurar ${label.toLowerCase()}`}
      >
        <RotateCcw className="h-3.5 w-3.5" />
      </Button>
    </div>
  </div>
);

const AdminContentEditor = ({ filterKeys }: { filterKeys?: string[] }) => {
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
  const [campaignProducts, setCampaignProducts] = useState<CampaignProductOption[]>([]);
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
  const [tiendaHeroDraft, setTiendaHeroDraft] = useState<TiendaHeroConfig>({
    ...DEFAULT_TIENDA_HERO,
    features: DEFAULT_TIENDA_HERO.features.map((f) => ({ ...f })),
  });
  const [badgesDraft, setBadgesDraft] = useState<SiteBadgesConfig>({
    sale: { ...DEFAULT_SALE_BADGE },
  });
  const [whatsappDraft, setWhatsappDraft] = useState<WhatsAppButtonConfig>({
    ...DEFAULT_WHATSAPP_BUTTON,
  });
  const [tiendaHeroUploading, setTiendaHeroUploading] = useState<"desktop" | "mobile" | null>(null);
  const [tiendaHeroDragOver, setTiendaHeroDragOver] = useState<"desktop" | "mobile" | null>(null);
  const [tiendaHeroCropOpen, setTiendaHeroCropOpen] = useState(false);
  const [tiendaHeroCropSrc, setTiendaHeroCropSrc] = useState<string | null>(null);
  const [tiendaHeroCropVariant, setTiendaHeroCropVariant] = useState<OptimizeImageVariant>("desktop");
  const [tiendaHeroPreviewDevice, setTiendaHeroPreviewDevice] =
    useState<TiendaHeroPreviewDevice>("desktop");
  const tiendaHeroDesktopInputRef = useRef<HTMLInputElement>(null);
  const tiendaHeroMobileInputRef = useRef<HTMLInputElement>(null);

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
      ctaText: campaignDraft.ctaText.trim() || DEFAULT_CAMPAIGN.ctaText,
      ctaProductSlug: campaignDraft.ctaProductSlug.trim().replace(/^\/+|\/+$/g, ""),
      ctaBg: isHex(campaignDraft.ctaBg) ? campaignDraft.ctaBg.trim() : DEFAULT_CAMPAIGN.ctaBg,
      ctaTextColor: isHex(campaignDraft.ctaTextColor)
        ? campaignDraft.ctaTextColor.trim()
        : DEFAULT_CAMPAIGN.ctaTextColor,
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

  const buildTiendaHeroPayload = () => {
    const config: TiendaHeroConfig = parseTiendaHeroConfig(
      serializeTiendaHeroConfig({
        ...tiendaHeroDraft,
        eyebrow: tiendaHeroDraft.eyebrow.trim() || DEFAULT_TIENDA_HERO.eyebrow,
        headline: tiendaHeroDraft.headline.trim() || DEFAULT_TIENDA_HERO.headline,
        description: tiendaHeroDraft.description.trim() || DEFAULT_TIENDA_HERO.description,
        ctaText: tiendaHeroDraft.ctaText.trim() || DEFAULT_TIENDA_HERO.ctaText,
        ctaHref: tiendaHeroDraft.ctaHref.trim() || DEFAULT_TIENDA_HERO.ctaHref,
        accentColor: isHex(tiendaHeroDraft.accentColor)
          ? tiendaHeroDraft.accentColor.trim()
          : DEFAULT_TIENDA_HERO.accentColor,
        headlineColor: isHex(tiendaHeroDraft.headlineColor)
          ? tiendaHeroDraft.headlineColor.trim()
          : DEFAULT_TIENDA_HERO.headlineColor,
        descriptionColor: isHex(tiendaHeroDraft.descriptionColor)
          ? tiendaHeroDraft.descriptionColor.trim()
          : DEFAULT_TIENDA_HERO.descriptionColor,
        featureColor: isHex(tiendaHeroDraft.featureColor)
          ? tiendaHeroDraft.featureColor.trim()
          : DEFAULT_TIENDA_HERO.featureColor,
        ctaBg: isHex(tiendaHeroDraft.ctaBg) ? tiendaHeroDraft.ctaBg.trim() : DEFAULT_TIENDA_HERO.ctaBg,
        ctaTextColor: isHex(tiendaHeroDraft.ctaTextColor)
          ? tiendaHeroDraft.ctaTextColor.trim()
          : DEFAULT_TIENDA_HERO.ctaTextColor,
        desktopImageUrl: tiendaHeroDraft.desktopImageUrl.trim(),
        mobileImageUrl: tiendaHeroDraft.mobileImageUrl.trim(),
        alt: tiendaHeroDraft.alt.trim() || DEFAULT_TIENDA_HERO.alt,
        overlayStrength: tiendaHeroDraft.overlayStrength,
        contentPosX: tiendaHeroDraft.contentPosX,
        contentPosY: tiendaHeroDraft.contentPosY,
        contentPosMobileX: tiendaHeroDraft.contentPosMobileX,
        contentPosMobileY: tiendaHeroDraft.contentPosMobileY,
      }),
    );
    return {
      title: "Hero de la tienda",
      content: serializeTiendaHeroConfig(config),
      config,
    };
  };

  const buildBadgesPayload = () => {
    const config = parseSiteBadgesConfig(
      serializeSiteBadgesConfig({
        sale: {
          text: badgesDraft.sale.text.trim() || DEFAULT_SALE_BADGE.text,
          background: isHex(badgesDraft.sale.background)
            ? badgesDraft.sale.background.trim()
            : DEFAULT_SALE_BADGE.background,
          textColor: isHex(badgesDraft.sale.textColor)
            ? badgesDraft.sale.textColor.trim()
            : DEFAULT_SALE_BADGE.textColor,
        },
      }),
    );
    return {
      title: "Badge de oferta",
      content: serializeSiteBadgesConfig(config),
      config,
    };
  };

  const buildWhatsAppPayload = () => {
    const config = parseWhatsAppButtonConfig(
      serializeWhatsAppButtonConfig({
        enabled: Boolean(whatsappDraft.enabled),
        phone: whatsappDraft.phone.trim() || DEFAULT_WHATSAPP_BUTTON.phone,
        message: whatsappDraft.message,
        background: isHex(whatsappDraft.background)
          ? whatsappDraft.background.trim()
          : DEFAULT_WHATSAPP_BUTTON.background,
        iconColor: isHex(whatsappDraft.iconColor)
          ? whatsappDraft.iconColor.trim()
          : DEFAULT_WHATSAPP_BUTTON.iconColor,
      }),
    );
    return {
      title: "Botón de WhatsApp",
      content: serializeWhatsAppButtonConfig(config),
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

  const uploadTiendaHeroImage = async (file: File, variant: OptimizeImageVariant) => {
    setTiendaHeroUploading(variant);
    try {
      const optimized = await optimizeImageForUpload(file, variant);
      const filePath = `tienda-hero-${variant}-${Date.now()}.${optimized.extension}`;
      const { error: uploadError } = await supabase.storage
        .from(CAMPAIGN_BUCKET)
        .upload(filePath, optimized.blob, {
          upsert: true,
          contentType: optimized.mimeType,
        });
      if (uploadError) throw uploadError;

      const publicUrl = `${SUPABASE_URL}/storage/v1/object/public/${CAMPAIGN_BUCKET}/${filePath}`;
      setTiendaHeroDraft((prev) => ({
        ...prev,
        ...(variant === "desktop"
          ? { desktopImageUrl: publicUrl }
          : { mobileImageUrl: publicUrl }),
      }));
      toast({
        title: "Imagen subida",
        description: `Fondo ${variant === "desktop" ? "escritorio/tablet" : "móvil"} optimizado (${optimized.extension.toUpperCase()}).`,
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "No se pudo subir la imagen.";
      toast({ title: "Error al subir", description: message, variant: "destructive" });
      throw err instanceof Error ? err : new Error(message);
    } finally {
      setTiendaHeroUploading(null);
    }
  };

  const beginTiendaHeroCrop = (file: File, variant: OptimizeImageVariant) => {
    if (!file.type.startsWith("image/")) {
      toast({
        title: "Archivo no válido",
        description: "Selecciona una imagen.",
        variant: "destructive",
      });
      return;
    }
    if (tiendaHeroCropSrc?.startsWith("blob:")) {
      URL.revokeObjectURL(tiendaHeroCropSrc);
    }
    setTiendaHeroCropVariant(variant);
    setTiendaHeroCropSrc(URL.createObjectURL(file));
    setTiendaHeroCropOpen(true);
  };

  const handleTiendaHeroCropOpenChange = (open: boolean) => {
    setTiendaHeroCropOpen(open);
    if (!open && tiendaHeroCropSrc?.startsWith("blob:")) {
      URL.revokeObjectURL(tiendaHeroCropSrc);
      setTiendaHeroCropSrc(null);
    }
  };

  const handleTiendaHeroDrop = (e: DragEvent, variant: OptimizeImageVariant) => {
    e.preventDefault();
    e.stopPropagation();
    setTiendaHeroDragOver(null);
    if (tiendaHeroUploading || tiendaHeroCropOpen) return;
    const file = Array.from(e.dataTransfer.files || []).find((f) => f.type.startsWith("image/"));
    if (file) beginTiendaHeroCrop(file, variant);
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
      const [{ data, error }, productsRes] = await Promise.all([
        (supabase as any).from("site_content").select("*").order("key"),
        (supabase as any)
          .from("products")
          .select("id, name, slug, category")
          .order("name"),
      ]);

      if (productsRes?.data) {
        setCampaignProducts(
          (productsRes.data as CampaignProductOption[]).filter(
            (p) => typeof p.slug === "string" && p.slug.trim().length > 0,
          ),
        );
      }

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

      const hasTiendaHero = rows.some((b) => b.key === "tienda_hero");
      if (!hasTiendaHero) {
        const { data: inserted } = await (supabase as any)
          .from("site_content")
          .insert({
            key: "tienda_hero",
            title: "Hero de la tienda",
            content: serializeTiendaHeroConfig(DEFAULT_TIENDA_HERO),
          })
          .select("*")
          .single();

        if (inserted) rows = [...rows, inserted];
      }

      const hasSiteBadges = rows.some((b) => b.key === "site_badges");
      if (!hasSiteBadges) {
        const { data: inserted } = await (supabase as any)
          .from("site_content")
          .insert({
            key: "site_badges",
            title: "Badge de oferta",
            content: serializeSiteBadgesConfig(DEFAULT_SITE_BADGES),
          })
          .select("*")
          .single();

        if (inserted) rows = [...rows, inserted];
      }

      const hasWhatsApp = rows.some((b) => b.key === "whatsapp_button");
      if (!hasWhatsApp) {
        const { data: inserted } = await (supabase as any)
          .from("site_content")
          .insert({
            key: "whatsapp_button",
            title: "Botón de WhatsApp",
            content: serializeWhatsAppButtonConfig(DEFAULT_WHATSAPP_BUTTON),
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

      const tiendaHeroRow = rows.find((b) => b.key === "tienda_hero");
      if (tiendaHeroRow) {
        const cfg = parseTiendaHeroConfig(tiendaHeroRow.content);
        setTiendaHeroDraft(cfg);
        tiendaHeroRow.title = "Hero de la tienda";
        tiendaHeroRow.content = serializeTiendaHeroConfig(cfg);
      }

      const badgesRow = rows.find((b) => b.key === "site_badges");
      if (badgesRow) {
        const cfg = parseSiteBadgesConfig(badgesRow.content);
        setBadgesDraft(cfg);
        badgesRow.title = "Badge de oferta";
        badgesRow.content = serializeSiteBadgesConfig(cfg);
      }

      const whatsappRow = rows.find((b) => b.key === "whatsapp_button");
      if (whatsappRow) {
        const cfg = parseWhatsAppButtonConfig(whatsappRow.content);
        setWhatsappDraft(cfg);
        whatsappRow.title = "Botón de WhatsApp";
        whatsappRow.content = serializeWhatsAppButtonConfig(cfg);
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
    if (block.key === "tienda_hero") {
      const payload = buildTiendaHeroPayload();
      return payload.title !== baseline.title || payload.content !== baseline.content;
    }
    if (block.key === "site_badges") {
      const payload = buildBadgesPayload();
      return payload.title !== baseline.title || payload.content !== baseline.content;
    }
    if (block.key === "whatsapp_button") {
      const payload = buildWhatsAppPayload();
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

    if (block.key === "tienda_hero") {
      const { title, content, config } = buildTiendaHeroPayload();
      payload = { title, content };
      setTiendaHeroDraft(config);
      setBlocks((prev) =>
        prev.map((b) =>
          b.key === "tienda_hero" ? { ...b, title: payload.title, content: payload.content } : b
        )
      );
    }

    if (block.key === "site_badges") {
      const { title, content, config } = buildBadgesPayload();
      payload = { title, content };
      setBadgesDraft(config);
      setBlocks((prev) =>
        prev.map((b) =>
          b.key === "site_badges" ? { ...b, title: payload.title, content: payload.content } : b
        )
      );
    }

    if (block.key === "whatsapp_button") {
      const { title, content, config } = buildWhatsAppPayload();
      payload = { title, content };
      setWhatsappDraft(config);
      setBlocks((prev) =>
        prev.map((b) =>
          b.key === "whatsapp_button" ? { ...b, title: payload.title, content: payload.content } : b
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
    .filter((block) => !filterKeys || filterKeys.includes(block.key))
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
  const tiendaHeroPreviewConfig = buildTiendaHeroPayload().config;

  if (visibleBlocks.length === 0) {
    return (
      <div className="p-8 text-center text-carbon/40 bg-white rounded-xl shadow-[0_4px_20px_rgba(0,0,0,0.04)]">
        No hay contenido para esta sección.
      </div>
    );
  }

  return (
    <>
    <div className="space-y-6">
      {visibleBlocks.map((block) => {
        const isHero = block.key === "index_hero";
        const isWelcomePopup = block.key === "index_welcome_popup";
        const isMarquee = block.key === "index_marquee";
        const isHeadline = block.key === "index_collection_headline";
        const isCampaign = block.key === "index_campaign";
        const isTiendaHero = block.key === "tienda_hero";
        const isBadges = block.key === "site_badges";
        const isWhatsApp = block.key === "whatsapp_button";
        const dirty = isBlockDirty(block);

        return (
          <div
            key={block.key}
            className={cn(
              "bg-white rounded-xl shadow-[0_4px_20px_rgba(0,0,0,0.04)] p-6",
              (isHero || isCampaign || isWelcomePopup || isTiendaHero || isBadges || isWhatsApp) && "ring-1 ring-gold/20",
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
            {isTiendaHero && (
              <p className="text-xs text-carbon/40 -mt-2 mb-4">
                Cabecera de la página de tienda: fondo (escritorio y móvil), textos, ventajas, CTA
                y colores.
              </p>
            )}
            {isBadges && (
              <p className="text-xs text-carbon/40 -mt-2 mb-4">
                Etiqueta de oferta sobre las fotos de producto (inicio, tienda y ficha). El color
                por defecto es el rosa del botón CTA de la campaña publicitaria.
              </p>
            )}
            {isWhatsApp && (
              <p className="text-xs text-carbon/40 -mt-2 mb-4">
                Botón flotante de contacto en todas las páginas (excepto el panel). Número,
                mensaje precargado, colores y visibilidad.
              </p>
            )}

            <div className="space-y-4">
              {!isMarquee && !isHeadline && !isCampaign && !isHero && !isWelcomePopup && !isTiendaHero && !isBadges && !isWhatsApp && (
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

              {isBadges && (
                <>
                  <div>
                    <Label className="text-carbon/60 text-xs uppercase tracking-wider">
                      Texto
                    </Label>
                    <Input
                      value={badgesDraft.sale.text}
                      onChange={(e) =>
                        setBadgesDraft((prev) => ({
                          ...prev,
                          sale: { ...prev.sale, text: e.target.value },
                        }))
                      }
                      className="mt-1 border-gold/20 focus-visible:ring-gold/30"
                      placeholder={DEFAULT_SALE_BADGE.text}
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <AdminColorField
                      label="Color de fondo"
                      value={badgesDraft.sale.background}
                      fallback={DEFAULT_SALE_BADGE.background}
                      onChange={(hex) =>
                        setBadgesDraft((prev) => ({
                          ...prev,
                          sale: { ...prev.sale, background: hex },
                        }))
                      }
                      ariaLabel="Color de fondo del badge de oferta"
                    />
                    <AdminColorField
                      label="Color del texto"
                      value={badgesDraft.sale.textColor}
                      fallback={DEFAULT_SALE_BADGE.textColor}
                      onChange={(hex) =>
                        setBadgesDraft((prev) => ({
                          ...prev,
                          sale: { ...prev.sale, textColor: hex },
                        }))
                      }
                      ariaLabel="Color del texto del badge de oferta"
                    />
                  </div>

                  <div className="rounded-lg border border-carbon/10 p-4" style={{ backgroundColor: "#F8F3EB" }}>
                    <p className="text-xs uppercase tracking-wider text-carbon/40 mb-3">
                      Vista previa
                    </p>
                    <div className="relative aspect-square max-w-[220px] overflow-hidden rounded-2xl bg-white shadow-[0_4px_20px_rgba(0,0,0,0.06)] ring-1 ring-black/4">
                      <div className="absolute inset-0 bg-[linear-gradient(145deg,#f4efe4_0%,#e8dcc8_100%)]" />
                      <SaleBadgeChip
                        text={badgesDraft.sale.text.trim() || DEFAULT_SALE_BADGE.text}
                        background={
                          isHex(badgesDraft.sale.background)
                            ? badgesDraft.sale.background
                            : DEFAULT_SALE_BADGE.background
                        }
                        textColor={
                          isHex(badgesDraft.sale.textColor)
                            ? badgesDraft.sale.textColor
                            : DEFAULT_SALE_BADGE.textColor
                        }
                        className="absolute left-3 top-3 z-10"
                      />
                    </div>
                  </div>
                </>
              )}

              {isWhatsApp && (
                <>
                  <div className="flex items-center justify-between gap-3 rounded-lg border border-gold/15 bg-cream/40 px-4 py-3">
                    <div>
                      <p className="text-sm font-medium text-carbon">Mostrar botón</p>
                      <p className="text-xs text-carbon/45">
                        Si está desactivado, no aparecerá en la web.
                      </p>
                    </div>
                    <Switch
                      checked={whatsappDraft.enabled}
                      onCheckedChange={(v) =>
                        setWhatsappDraft((prev) => ({ ...prev, enabled: v === true }))
                      }
                    />
                  </div>

                  <div>
                    <Label className="text-carbon/60 text-xs uppercase tracking-wider">
                      Número de WhatsApp
                    </Label>
                    <Input
                      value={whatsappDraft.phone}
                      onChange={(e) =>
                        setWhatsappDraft((prev) => ({ ...prev, phone: e.target.value }))
                      }
                      className="mt-1 border-gold/20 focus-visible:ring-gold/30"
                      inputMode="tel"
                      placeholder={DEFAULT_WHATSAPP_BUTTON.phone}
                    />
                    <p className="text-xs text-carbon/30 mt-1">
                      Con prefijo de país, sin espacios ni +. Ejemplo: {DEFAULT_WHATSAPP_BUTTON.phone}
                    </p>
                  </div>

                  <div>
                    <Label className="text-carbon/60 text-xs uppercase tracking-wider">
                      Mensaje precargado
                    </Label>
                    <Textarea
                      value={whatsappDraft.message}
                      onChange={(e) =>
                        setWhatsappDraft((prev) => ({ ...prev, message: e.target.value }))
                      }
                      rows={3}
                      className="mt-1 border-gold/20 focus-visible:ring-gold/30"
                      placeholder="Hola, me gustaría consultar…"
                    />
                    <p className="text-xs text-carbon/30 mt-1">
                      Opcional. Si lo rellenas, se abrirá el chat con este texto.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <AdminColorField
                      label="Color de fondo"
                      value={whatsappDraft.background}
                      fallback={DEFAULT_WHATSAPP_BUTTON.background}
                      onChange={(hex) =>
                        setWhatsappDraft((prev) => ({ ...prev, background: hex }))
                      }
                      ariaLabel="Color de fondo del botón de WhatsApp"
                    />
                    <AdminColorField
                      label="Color del icono"
                      value={whatsappDraft.iconColor}
                      fallback={DEFAULT_WHATSAPP_BUTTON.iconColor}
                      onChange={(hex) =>
                        setWhatsappDraft((prev) => ({ ...prev, iconColor: hex }))
                      }
                      ariaLabel="Color del icono de WhatsApp"
                    />
                  </div>

                  <div className="rounded-lg border border-carbon/10 p-4" style={{ backgroundColor: "#F8F3EB" }}>
                    <p className="text-xs uppercase tracking-wider text-carbon/40 mb-3">
                      Vista previa
                    </p>
                    <WhatsAppButtonView
                      preview
                      config={{
                        ...whatsappDraft,
                        background: isHex(whatsappDraft.background)
                          ? whatsappDraft.background
                          : DEFAULT_WHATSAPP_BUTTON.background,
                        iconColor: isHex(whatsappDraft.iconColor)
                          ? whatsappDraft.iconColor
                          : DEFAULT_WHATSAPP_BUTTON.iconColor,
                      }}
                    />
                    {!whatsappDraft.enabled && (
                      <p className="text-xs text-carbon/40 mt-2">
                        Oculto en la web hasta que lo actives.
                      </p>
                    )}
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
                      Texto del CTA
                    </Label>
                    <Input
                      value={campaignDraft.ctaText}
                      onChange={(e) =>
                        setCampaignDraft((prev) => ({ ...prev, ctaText: e.target.value }))
                      }
                      className="mt-1 border-gold/20 focus-visible:ring-gold/30"
                      placeholder={DEFAULT_CAMPAIGN.ctaText}
                    />
                  </div>

                  <div>
                    <Label className="text-carbon/60 text-xs uppercase tracking-wider">
                      Producto del CTA
                    </Label>
                    <Select
                      value={
                        campaignDraft.ctaProductSlug.trim() || CAMPAIGN_CTA_TIENDA_VALUE
                      }
                      onValueChange={(value) =>
                        setCampaignDraft((prev) => ({
                          ...prev,
                          ctaProductSlug:
                            value === CAMPAIGN_CTA_TIENDA_VALUE ? "" : value,
                        }))
                      }
                    >
                      <SelectTrigger className="mt-1 border-gold/20 bg-white focus:ring-gold/30">
                        <SelectValue placeholder="Elige un producto del catálogo" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={CAMPAIGN_CTA_TIENDA_VALUE}>
                          Tienda (catálogo completo)
                        </SelectItem>
                        {campaignDraft.ctaProductSlug.trim() &&
                        !campaignProducts.some(
                          (p) => p.slug === campaignDraft.ctaProductSlug.trim(),
                        ) ? (
                          <SelectItem value={campaignDraft.ctaProductSlug.trim()}>
                            {campaignDraft.ctaProductSlug.trim()} (ya no está en el catálogo)
                          </SelectItem>
                        ) : null}
                        {campaignProducts.map((p) => (
                          <SelectItem key={p.id} value={p.slug}>
                            {p.name}
                            {p.category ? ` · ${p.category}` : ""}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="mt-1 text-xs text-carbon/30">
                      Enlace:{" "}
                      <span className="font-mono text-carbon/50">
                        {campaignCtaPath(campaignDraft)}
                      </span>
                      {campaignProducts.length === 0
                        ? " · Añade productos en el catálogo para enlazarlos aquí."
                        : null}
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <Label className="text-carbon/60 text-xs uppercase tracking-wider">
                        Color del CTA
                      </Label>
                      <div className="mt-1 flex items-center gap-2">
                        <HexColorField
                          value={campaignDraft.ctaBg}
                          onChange={(hex) =>
                            setCampaignDraft((prev) => ({ ...prev, ctaBg: hex }))
                          }
                          fallback={DEFAULT_CAMPAIGN.ctaBg}
                          aria-label="Color del botón CTA de campaña"
                          className="flex-1 min-w-0"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={
                            toPickerColor(campaignDraft.ctaBg) ===
                            toPickerColor(DEFAULT_CAMPAIGN.ctaBg)
                          }
                          onClick={() =>
                            setCampaignDraft((prev) => ({
                              ...prev,
                              ctaBg: DEFAULT_CAMPAIGN.ctaBg,
                            }))
                          }
                          className="shrink-0 border-gold/20 text-carbon/60 hover:text-carbon disabled:opacity-40 h-10"
                          aria-label="Restaurar color del CTA"
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
                          value={campaignDraft.ctaTextColor}
                          onChange={(hex) =>
                            setCampaignDraft((prev) => ({ ...prev, ctaTextColor: hex }))
                          }
                          fallback={DEFAULT_CAMPAIGN.ctaTextColor}
                          aria-label="Color del texto del CTA de campaña"
                          className="flex-1 min-w-0"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={
                            toPickerColor(campaignDraft.ctaTextColor) ===
                            toPickerColor(DEFAULT_CAMPAIGN.ctaTextColor)
                          }
                          onClick={() =>
                            setCampaignDraft((prev) => ({
                              ...prev,
                              ctaTextColor: DEFAULT_CAMPAIGN.ctaTextColor,
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

              {isTiendaHero && (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label className="text-carbon/60 text-xs uppercase tracking-wider">
                        Imagen de fondo · escritorio / tablet
                      </Label>
                      <input
                        ref={tiendaHeroDesktopInputRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          e.target.value = "";
                          if (file) beginTiendaHeroCrop(file, "desktop");
                        }}
                      />
                      <div
                        role="button"
                        tabIndex={0}
                        onClick={() => {
                          if (tiendaHeroUploading) return;
                          tiendaHeroDesktopInputRef.current?.click();
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            if (!tiendaHeroUploading) tiendaHeroDesktopInputRef.current?.click();
                          }
                        }}
                        onDragEnter={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setTiendaHeroDragOver("desktop");
                        }}
                        onDragOver={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setTiendaHeroDragOver("desktop");
                        }}
                        onDragLeave={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setTiendaHeroDragOver((prev) => (prev === "desktop" ? null : prev));
                        }}
                        onDrop={(e) => handleTiendaHeroDrop(e, "desktop")}
                        className={cn(
                          "relative mt-2 cursor-pointer overflow-hidden rounded-xl border-2 border-dashed transition-all duration-200",
                          tiendaHeroDragOver === "desktop"
                            ? "border-gold bg-gold/5 scale-[1.01]"
                            : "border-gold/20 hover:border-gold/40",
                          tiendaHeroDraft.desktopImageUrl ? "aspect-video bg-muted" : "min-h-36 bg-muted/40",
                        )}
                      >
                        {tiendaHeroUploading === "desktop" && (
                          <div className="absolute inset-0 z-10 flex items-center justify-center bg-carbon/40">
                            <Loader2 className="h-7 w-7 animate-spin text-white" />
                          </div>
                        )}
                        {tiendaHeroDraft.desktopImageUrl ? (
                          <img
                            src={tiendaHeroDraft.desktopImageUrl}
                            alt="Vista previa escritorio"
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="flex h-full min-h-36 flex-col items-center justify-center gap-2 px-4 py-8 text-carbon/40">
                            <Upload className="h-8 w-8" />
                            <span className="text-sm text-center">Arrastra una imagen o haz clic</span>
                          </div>
                        )}
                        {tiendaHeroDraft.desktopImageUrl && tiendaHeroUploading !== "desktop" && (
                          <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-carbon/0 opacity-0 transition-opacity hover:bg-carbon/30 hover:opacity-100">
                            <span className="rounded-lg bg-carbon/60 px-3 py-1.5 text-xs text-white">
                              Cambiar imagen
                            </span>
                          </div>
                        )}
                      </div>
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        {tiendaHeroDraft.desktopImageUrl && (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              setTiendaHeroDraft((prev) => ({ ...prev, desktopImageUrl: "" }))
                            }
                            className="border-gold/20 text-carbon/60"
                          >
                            <Trash2 className="h-3.5 w-3.5 mr-1.5" />
                            Quitar
                          </Button>
                        )}
                        <p className="text-xs text-carbon/30">
                          Opcional; sin imagen se usa el fondo degradado.
                        </p>
                      </div>
                    </div>

                    <div>
                      <Label className="text-carbon/60 text-xs uppercase tracking-wider">
                        Imagen de fondo · móvil
                      </Label>
                      <input
                        ref={tiendaHeroMobileInputRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          e.target.value = "";
                          if (file) beginTiendaHeroCrop(file, "mobile");
                        }}
                      />
                      <div
                        role="button"
                        tabIndex={0}
                        onClick={() => {
                          if (tiendaHeroUploading) return;
                          tiendaHeroMobileInputRef.current?.click();
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            if (!tiendaHeroUploading) tiendaHeroMobileInputRef.current?.click();
                          }
                        }}
                        onDragEnter={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setTiendaHeroDragOver("mobile");
                        }}
                        onDragOver={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setTiendaHeroDragOver("mobile");
                        }}
                        onDragLeave={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setTiendaHeroDragOver((prev) => (prev === "mobile" ? null : prev));
                        }}
                        onDrop={(e) => handleTiendaHeroDrop(e, "mobile")}
                        className={cn(
                          "relative mt-2 cursor-pointer overflow-hidden rounded-xl border-2 border-dashed transition-all duration-200",
                          tiendaHeroDragOver === "mobile"
                            ? "border-gold bg-gold/5 scale-[1.01]"
                            : "border-gold/20 hover:border-gold/40",
                          tiendaHeroDraft.mobileImageUrl ? "aspect-3/4 max-h-56 bg-muted" : "min-h-36 bg-muted/40",
                        )}
                      >
                        {tiendaHeroUploading === "mobile" && (
                          <div className="absolute inset-0 z-10 flex items-center justify-center bg-carbon/40">
                            <Loader2 className="h-7 w-7 animate-spin text-white" />
                          </div>
                        )}
                        {tiendaHeroDraft.mobileImageUrl ? (
                          <img
                            src={tiendaHeroDraft.mobileImageUrl}
                            alt="Vista previa móvil"
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="flex h-full min-h-36 flex-col items-center justify-center gap-2 px-4 py-8 text-carbon/40">
                            <Upload className="h-8 w-8" />
                            <span className="text-sm text-center">Arrastra una imagen o haz clic</span>
                          </div>
                        )}
                        {tiendaHeroDraft.mobileImageUrl && tiendaHeroUploading !== "mobile" && (
                          <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-carbon/0 opacity-0 transition-opacity hover:bg-carbon/30 hover:opacity-100">
                            <span className="rounded-lg bg-carbon/60 px-3 py-1.5 text-xs text-white">
                              Cambiar imagen
                            </span>
                          </div>
                        )}
                      </div>
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        {tiendaHeroDraft.mobileImageUrl && (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              setTiendaHeroDraft((prev) => ({ ...prev, mobileImageUrl: "" }))
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
                    (máx. 1920px escritorio / 1080px móvil), igual que en la campaña publicitaria.
                  </p>

                  <div>
                    <Label className="text-carbon/60 text-xs uppercase tracking-wider">
                      Texto alternativo (accesibilidad)
                    </Label>
                    <Input
                      value={tiendaHeroDraft.alt}
                      onChange={(e) =>
                        setTiendaHeroDraft((prev) => ({ ...prev, alt: e.target.value }))
                      }
                      className="mt-1 border-gold/20 focus-visible:ring-gold/30"
                      placeholder={DEFAULT_TIENDA_HERO.alt}
                    />
                  </div>

                  <div>
                    <Label className="text-carbon/60 text-xs uppercase tracking-wider">
                      Etiqueta superior
                    </Label>
                    <Input
                      value={tiendaHeroDraft.eyebrow}
                      onChange={(e) =>
                        setTiendaHeroDraft((prev) => ({ ...prev, eyebrow: e.target.value }))
                      }
                      className="mt-1 border-gold/20 focus-visible:ring-gold/30"
                      placeholder={DEFAULT_TIENDA_HERO.eyebrow}
                    />
                    <p className="text-xs text-carbon/30 mt-1">Se muestra en mayúsculas.</p>
                  </div>

                  <div>
                    <Label className="text-carbon/60 text-xs uppercase tracking-wider">
                      Titular
                    </Label>
                    <Textarea
                      value={tiendaHeroDraft.headline}
                      onChange={(e) =>
                        setTiendaHeroDraft((prev) => ({ ...prev, headline: e.target.value }))
                      }
                      rows={2}
                      className="mt-1 border-gold/20 focus-visible:ring-gold/30"
                    />
                  </div>

                  <div>
                    <Label className="text-carbon/60 text-xs uppercase tracking-wider">
                      Descripción
                    </Label>
                    <Textarea
                      value={tiendaHeroDraft.description}
                      onChange={(e) =>
                        setTiendaHeroDraft((prev) => ({ ...prev, description: e.target.value }))
                      }
                      rows={3}
                      className="mt-1 border-gold/20 focus-visible:ring-gold/30"
                    />
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <Label className="text-carbon/60 text-xs uppercase tracking-wider">
                        Ventajas (icono + texto)
                      </Label>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={tiendaHeroDraft.features.length >= 4}
                        onClick={() =>
                          setTiendaHeroDraft((prev) => ({
                            ...prev,
                            features: [
                              ...prev.features,
                              { icon: "sparkles", label: "" },
                            ],
                          }))
                        }
                        className="h-8 border-gold/20 text-carbon/60 hover:text-carbon disabled:opacity-40"
                      >
                        <Plus className="h-3.5 w-3.5 mr-1.5" />
                        Añadir
                      </Button>
                    </div>
                    {tiendaHeroDraft.features.map((feature, index) => (
                      <div
                        key={`tienda-feature-${index}`}
                        className="grid grid-cols-1 sm:grid-cols-[10rem_1fr_auto] gap-2 items-end"
                      >
                        <div>
                          {index === 0 ? (
                            <Label className="text-carbon/60 text-xs uppercase tracking-wider">
                              Icono
                            </Label>
                          ) : null}
                          <Select
                            value={feature.icon}
                            onValueChange={(value) =>
                              setTiendaHeroDraft((prev) => ({
                                ...prev,
                                features: prev.features.map((f, i) =>
                                  i === index ? { ...f, icon: value as TiendaHeroIconId } : f,
                                ),
                              }))
                            }
                          >
                            <SelectTrigger
                              className={cn(
                                "border-gold/20 bg-white focus:ring-gold/30",
                                index === 0 ? "mt-1" : "",
                              )}
                            >
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {TIENDA_HERO_ICON_IDS.map((id) => (
                                <SelectItem key={id} value={id}>
                                  {TIENDA_HERO_ICON_LABELS[id]}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          {index === 0 ? (
                            <Label className="text-carbon/60 text-xs uppercase tracking-wider">
                              Texto
                            </Label>
                          ) : null}
                          <Input
                            value={feature.label}
                            onChange={(e) =>
                              setTiendaHeroDraft((prev) => ({
                                ...prev,
                                features: prev.features.map((f, i) =>
                                  i === index ? { ...f, label: e.target.value } : f,
                                ),
                              }))
                            }
                            className={cn(
                              "border-gold/20 focus-visible:ring-gold/30",
                              index === 0 ? "mt-1" : "",
                            )}
                            placeholder="Calidad profesional"
                          />
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            setTiendaHeroDraft((prev) => ({
                              ...prev,
                              features: prev.features.filter((_, i) => i !== index),
                            }))
                          }
                          className="h-10 border-gold/20 text-carbon/60 hover:text-carbon"
                          aria-label={`Quitar ventaja ${index + 1}`}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    ))}
                    <p className="text-xs text-carbon/30">Hasta 4 ventajas. Vacías no se muestran.</p>
                  </div>

                  <div>
                    <Label className="text-carbon/60 text-xs uppercase tracking-wider">
                      Texto del CTA
                    </Label>
                    <Input
                      value={tiendaHeroDraft.ctaText}
                      onChange={(e) =>
                        setTiendaHeroDraft((prev) => ({ ...prev, ctaText: e.target.value }))
                      }
                      className="mt-1 border-gold/20 focus-visible:ring-gold/30"
                      placeholder={DEFAULT_TIENDA_HERO.ctaText}
                    />
                  </div>

                  <div>
                    <Label className="text-carbon/60 text-xs uppercase tracking-wider">
                      Enlace del CTA
                    </Label>
                    <Input
                      value={tiendaHeroDraft.ctaHref}
                      onChange={(e) =>
                        setTiendaHeroDraft((prev) => ({ ...prev, ctaHref: e.target.value }))
                      }
                      className="mt-1 border-gold/20 focus-visible:ring-gold/30 font-mono text-sm"
                      placeholder="#productos"
                    />
                    <p className="text-xs text-carbon/30 mt-1">
                      Ancla de la tienda (<span className="font-mono">#productos</span>,{" "}
                      <span className="font-mono">#packs-destacados</span>), ruta interna o URL.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <AdminColorField
                      label="Color de acento"
                      value={tiendaHeroDraft.accentColor}
                      fallback={DEFAULT_TIENDA_HERO.accentColor}
                      onChange={(hex) =>
                        setTiendaHeroDraft((prev) => ({ ...prev, accentColor: hex }))
                      }
                      ariaLabel="Color de acento (etiqueta e iconos)"
                    />
                    <AdminColorField
                      label="Color del titular"
                      value={tiendaHeroDraft.headlineColor}
                      fallback={DEFAULT_TIENDA_HERO.headlineColor}
                      onChange={(hex) =>
                        setTiendaHeroDraft((prev) => ({ ...prev, headlineColor: hex }))
                      }
                      ariaLabel="Color del titular de la tienda"
                    />
                    <AdminColorField
                      label="Color de la descripción"
                      value={tiendaHeroDraft.descriptionColor}
                      fallback={DEFAULT_TIENDA_HERO.descriptionColor}
                      onChange={(hex) =>
                        setTiendaHeroDraft((prev) => ({ ...prev, descriptionColor: hex }))
                      }
                      ariaLabel="Color de la descripción"
                    />
                    <AdminColorField
                      label="Color de las ventajas"
                      value={tiendaHeroDraft.featureColor}
                      fallback={DEFAULT_TIENDA_HERO.featureColor}
                      onChange={(hex) =>
                        setTiendaHeroDraft((prev) => ({ ...prev, featureColor: hex }))
                      }
                      ariaLabel="Color del texto de las ventajas"
                    />
                    <AdminColorField
                      label="Color del CTA"
                      value={tiendaHeroDraft.ctaBg}
                      fallback={DEFAULT_TIENDA_HERO.ctaBg}
                      onChange={(hex) =>
                        setTiendaHeroDraft((prev) => ({ ...prev, ctaBg: hex }))
                      }
                      ariaLabel="Color de fondo del CTA"
                    />
                    <AdminColorField
                      label="Color del texto del CTA"
                      value={tiendaHeroDraft.ctaTextColor}
                      fallback={DEFAULT_TIENDA_HERO.ctaTextColor}
                      onChange={(hex) =>
                        setTiendaHeroDraft((prev) => ({ ...prev, ctaTextColor: hex }))
                      }
                      ariaLabel="Color del texto del CTA"
                    />
                  </div>

                  <div>
                    <Label className="text-carbon/60 text-xs uppercase tracking-wider">
                      Intensidad del overlay (%)
                    </Label>
                    <div className="mt-1 flex items-center gap-2">
                      <Input
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        value={String(tiendaHeroDraft.overlayStrength)}
                        onChange={(e) => {
                          const next = e.target.value.replace(/[^\d]/g, "");
                          setTiendaHeroDraft((prev) => ({
                            ...prev,
                            overlayStrength: next === "" ? 0 : Math.min(100, Number(next)),
                          }));
                        }}
                        onBlur={() => {
                          setTiendaHeroDraft((prev) => ({
                            ...prev,
                            overlayStrength: Math.min(
                              100,
                              Math.max(0, Math.round(prev.overlayStrength)),
                            ),
                          }));
                        }}
                        className="border-gold/20 focus-visible:ring-gold/30 max-w-[6rem]"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={tiendaHeroDraft.overlayStrength === DEFAULT_TIENDA_HERO.overlayStrength}
                        onClick={() =>
                          setTiendaHeroDraft((prev) => ({
                            ...prev,
                            overlayStrength: DEFAULT_TIENDA_HERO.overlayStrength,
                          }))
                        }
                        className="shrink-0 border-gold/20 text-carbon/60 hover:text-carbon disabled:opacity-40 h-10"
                        aria-label="Restaurar intensidad del overlay"
                      >
                        <RotateCcw className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                    <p className="text-xs text-carbon/30 mt-1">
                      Solo con imagen de fondo. 0 = sin overlay; 100 = máxima cobertura clara.
                    </p>
                  </div>

                  <div>
                    <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                      <Label className="text-carbon/60 text-xs uppercase tracking-wider">
                        Vista previa (arrastra el contenido)
                      </Label>
                      <div className="flex flex-wrap items-center gap-2">
                        <div className="flex rounded-md border border-gold/20 overflow-hidden">
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          onClick={() => setTiendaHeroPreviewDevice("desktop")}
                          className={cn(
                            "h-8 gap-1.5 rounded-none px-3 text-xs",
                            tiendaHeroPreviewDevice === "desktop"
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
                          onClick={() => setTiendaHeroPreviewDevice("mobile")}
                          className={cn(
                            "h-8 gap-1.5 rounded-none px-3 text-xs",
                            tiendaHeroPreviewDevice === "mobile"
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
                            tiendaHeroPreviewDevice === "mobile"
                              ? tiendaHeroDraft.contentPosMobileX ===
                                  DEFAULT_TIENDA_HERO.contentPosMobileX &&
                                tiendaHeroDraft.contentPosMobileY ===
                                  DEFAULT_TIENDA_HERO.contentPosMobileY
                              : tiendaHeroDraft.contentPosX === DEFAULT_TIENDA_HERO.contentPosX &&
                                tiendaHeroDraft.contentPosY === DEFAULT_TIENDA_HERO.contentPosY
                          }
                          onClick={() =>
                            setTiendaHeroDraft((prev) =>
                              tiendaHeroPreviewDevice === "mobile"
                                ? {
                                    ...prev,
                                    contentPosMobileX: DEFAULT_TIENDA_HERO.contentPosMobileX,
                                    contentPosMobileY: DEFAULT_TIENDA_HERO.contentPosMobileY,
                                  }
                                : {
                                    ...prev,
                                    contentPosX: DEFAULT_TIENDA_HERO.contentPosX,
                                    contentPosY: DEFAULT_TIENDA_HERO.contentPosY,
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
                    <div
                      className={cn(
                        "rounded-xl border border-carbon/10 overflow-hidden bg-cream p-4 mx-auto transition-all",
                        tiendaHeroPreviewDevice === "mobile" ? "max-w-[390px]" : "w-full",
                      )}
                    >
                      <TiendaHero
                        config={tiendaHeroPreviewConfig}
                        preview
                        previewDevice={tiendaHeroPreviewDevice}
                        onContentPositionChange={(pos) =>
                          setTiendaHeroDraft((prev) =>
                            tiendaHeroPreviewDevice === "mobile"
                              ? {
                                  ...prev,
                                  contentPosMobileX: pos.x,
                                  contentPosMobileY: pos.y,
                                }
                              : {
                                  ...prev,
                                  contentPosX: pos.x,
                                  contentPosY: pos.y,
                                },
                          )
                        }
                      />
                    </div>
                    <p className="text-xs text-carbon/35 mt-2">
                      En móvil (&lt;768px) se usa la imagen móvil si existe; en escritorio, la de
                      escritorio. La posición del contenido se guarda aparte para escritorio y móvil.
                    </p>
                  </div>
                </>
              )}

              {!isHeadline && !isCampaign && !isHero && !isWelcomePopup && !isTiendaHero && !isBadges && !isWhatsApp && (
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
                {isTiendaHero && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setTiendaHeroDraft({
                        ...DEFAULT_TIENDA_HERO,
                        features: DEFAULT_TIENDA_HERO.features.map((f) => ({ ...f })),
                      });
                      toast({
                        title: "Diseño restablecido",
                        description:
                          "Textos, ventajas y colores vuelven a la versión por defecto. Guarda para aplicar.",
                      });
                    }}
                    className="border-gold/30 text-carbon/70 hover:bg-gold/10 hover:text-carbon"
                  >
                    <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
                    Restablecer diseño
                  </Button>
                )}
                {isBadges && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setBadgesDraft({ sale: { ...DEFAULT_SALE_BADGE } });
                      toast({
                        title: "Diseño restablecido",
                        description:
                          "Texto y colores vuelven a la versión por defecto. Guarda para aplicar.",
                      });
                    }}
                    className="border-gold/30 text-carbon/70 hover:bg-gold/10 hover:text-carbon"
                  >
                    <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
                    Restablecer diseño
                  </Button>
                )}
                {isWhatsApp && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setWhatsappDraft({ ...DEFAULT_WHATSAPP_BUTTON });
                      toast({
                        title: "Diseño restablecido",
                        description:
                          "Número, mensaje y colores vuelven a la versión por defecto. Guarda para aplicar.",
                      });
                    }}
                    className="border-gold/30 text-carbon/70 hover:bg-gold/10 hover:text-carbon"
                  >
                    <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
                    Restablecer diseño
                  </Button>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>

    <ProductImageCropDialog
      open={tiendaHeroCropOpen}
      imageSrc={tiendaHeroCropSrc}
      onOpenChange={handleTiendaHeroCropOpenChange}
      aspect={
        tiendaHeroCropVariant === "desktop" ? TIENDA_HERO_DESKTOP_ASPECT : TIENDA_HERO_MOBILE_ASPECT
      }
      maxOutputSize={tiendaHeroCropVariant === "desktop" ? 1920 : 1080}
      title={
        tiendaHeroCropVariant === "desktop"
          ? "Recortar fondo · Escritorio / tablet"
          : "Recortar fondo · Móvil"
      }
      onCropped={async (file) => {
        await uploadTiendaHeroImage(file, tiendaHeroCropVariant);
      }}
    />
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

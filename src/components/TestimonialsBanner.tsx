import type { CSSProperties } from "react";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import AnimatedSection from "@/components/AnimatedSection";
import type { CampaignPreviewDevice } from "@/components/CampaignBanner";
import { useHeroCtaStyle } from "@/hooks/use-hero-cta-style";
import { fontStyle } from "@/lib/fonts";
import { SITE_CTA_CLASS } from "@/lib/site-cta";
import {
  bundledWebpFor,
  clampTextBox,
  type TestimonialsBannerConfig,
} from "@/lib/testimonials-banner-content";
import { cn } from "@/lib/utils";

/** Tamaños de diseño, relativos al ancho de la foto (`cqw`) para que la vista previa del panel sea fiel. */
const TITLE_SIZE = { mobile: "clamp(1.75rem, 9cqw, 3rem)", desktop: "clamp(1.5rem, 2.85cqw, 2.75rem)" };
const SUBTITLE_SIZE = {
  mobile: "clamp(0.625rem, 2.9cqw, 0.95rem)",
  desktop: "clamp(0.625rem, 0.9cqw, 0.85rem)",
};

interface TestimonialsBannerProps {
  config: TestimonialsBannerConfig;
  /** Vista previa en admin: sin animación ni enlace. */
  preview?: boolean;
  /** En preview, fuerza foto, proporción y posición de ese dispositivo. */
  previewDevice?: CampaignPreviewDevice;
}

/**
 * Portada de la sección de reseñas en la home. Cada foto deja un hueco para el
 * texto (abajo a la izquierda en móvil, entre la cara y las miniaturas en
 * escritorio); su posición y ancho se ajustan desde el panel.
 */
const TestimonialsBanner = ({
  config,
  preview = false,
  previewDevice = "desktop",
}: TestimonialsBannerProps) => {
  const heroCtaStyle = useHeroCtaStyle();

  if (!preview && !config.enabled) return null;

  // En preview el viewport real es el del panel: los `md:` no sirven para
  // elegir dispositivo, así que se fuerza la variante con clases explícitas.
  const pick = (responsive: string, mobile: string, desktop: string) =>
    preview ? (previewDevice === "mobile" ? mobile : desktop) : responsive;

  const scale = config.textScale / 100;
  const mobileBox = clampTextBox(config.textPosMobileX, config.textPosMobileY, config.textWidthMobile);
  const desktopBox = clampTextBox(config.textPosX, config.textPosY, config.textWidth);
  const mobileVars = {
    left: `${mobileBox.x}%`,
    top: `${mobileBox.y}%`,
    width: `${mobileBox.width}%`,
    title: `calc(${scale} * ${TITLE_SIZE.mobile})`,
    subtitle: `calc(${scale} * ${SUBTITLE_SIZE.mobile})`,
  };
  const desktopVars = {
    left: `${desktopBox.x}%`,
    top: `${desktopBox.y}%`,
    width: `${desktopBox.width}%`,
    title: `calc(${scale} * ${TITLE_SIZE.desktop})`,
    subtitle: `calc(${scale} * ${SUBTITLE_SIZE.desktop})`,
  };
  const base = preview && previewDevice === "desktop" ? desktopVars : mobileVars;
  const md = preview && previewDevice === "mobile" ? mobileVars : desktopVars;
  const textVars = {
    "--tb-left": base.left,
    "--tb-top": base.top,
    "--tb-width": base.width,
    "--tb-title": base.title,
    "--tb-subtitle": base.subtitle,
    "--tb-left-md": md.left,
    "--tb-top-md": md.top,
    "--tb-width-md": md.width,
    "--tb-title-md": md.title,
    "--tb-subtitle-md": md.subtitle,
  } as CSSProperties;

  const ctaClass = cn(
    SITE_CTA_CLASS,
    "w-fit",
    pick(
      "mt-[8%] md:mt-4 md:px-3 md:tracking-[0.14em] lg:px-4 lg:tracking-[0.22em] xl:mt-6 xl:px-7",
      "mt-[8%]",
      "mt-6 px-7",
    ),
  );
  const ctaContent = (
    <>
      {config.ctaText}
      <ArrowRight
        aria-hidden
        className={pick("h-4 w-4 md:hidden lg:block xl:h-5 xl:w-5", "h-4 w-4", "h-5 w-5")}
        strokeWidth={1.75}
      />
    </>
  );
  const ctaStyle = { ...heroCtaStyle, ...fontStyle(config.fonts.cta) };
  const isExternal = /^https?:\/\//i.test(config.ctaHref);

  const activeSrc = previewDevice === "mobile" ? config.mobileImageUrl : config.desktopImageUrl;
  const desktopWebp = bundledWebpFor(config.desktopImageUrl);
  const mobileWebp = bundledWebpFor(config.mobileImageUrl);
  const imgClass = "absolute inset-0 h-full w-full object-cover";

  const banner = (
    <div
      className={cn(
        "@container relative overflow-hidden",
        pick(
          "aspect-[900/1600] md:aspect-[1552/563] md:rounded-[1.25rem] md:shadow-[0_18px_40px_-24px_rgba(90,60,40,0.55)]",
          "aspect-[900/1600]",
          "aspect-[1552/563]",
        ),
      )}
    >
      {preview ? (
        <img src={activeSrc} alt={config.alt} className={imgClass} />
      ) : (
        <picture>
          {desktopWebp ? (
            <source media="(min-width: 768px)" srcSet={desktopWebp} type="image/webp" />
          ) : null}
          <source media="(min-width: 768px)" srcSet={config.desktopImageUrl} />
          {mobileWebp ? <source srcSet={mobileWebp} type="image/webp" /> : null}
          <img
            src={config.mobileImageUrl}
            alt={config.alt}
            loading="lazy"
            decoding="async"
            className={imgClass}
          />
        </picture>
      )}

      <div
        className="absolute flex -translate-y-1/2 flex-col left-(--tb-left) top-(--tb-top) w-(--tb-width) md:left-(--tb-left-md) md:top-(--tb-top-md) md:w-(--tb-width-md)"
        style={textVars}
      >
        <h2
          id={preview ? undefined : "testimonials-banner-title"}
          className="font-semibold leading-[1.05] tracking-tight text-(length:--tb-title) md:text-(length:--tb-title-md)"
          style={{ color: config.titleColor, ...fontStyle(config.fonts.title) }}
        >
          {config.title}
        </h2>
        <div
          aria-hidden
          className={cn(
            "h-[2px]",
            pick("mt-[5%] mb-[6%] w-16 md:mt-4 md:mb-4 md:w-20", "mt-[5%] mb-[6%] w-16", "my-4 w-20"),
          )}
          style={{
            backgroundImage: `linear-gradient(to right, ${config.dividerColor}, transparent)`,
          }}
        />
        {config.subtitle ? (
          <p
            className="uppercase leading-relaxed tracking-[0.14em] text-(length:--tb-subtitle) md:text-(length:--tb-subtitle-md)"
            style={{ color: config.subtitleColor, ...fontStyle(config.fonts.subtitle) }}
          >
            {config.subtitle}
          </p>
        ) : null}
        {preview ? (
          <span className={cn(ctaClass, "pointer-events-none")} style={ctaStyle}>
            {ctaContent}
          </span>
        ) : isExternal ? (
          <a href={config.ctaHref} target="_blank" rel="noopener noreferrer" className={ctaClass} style={ctaStyle}>
            {ctaContent}
          </a>
        ) : (
          <Link to={config.ctaHref} className={ctaClass} style={ctaStyle}>
            {ctaContent}
          </Link>
        )}
      </div>
    </div>
  );

  if (preview) return banner;

  return (
    <section
      aria-labelledby="testimonials-banner-title"
      className="md:py-16"
      style={{ backgroundColor: "var(--theme-section-testimonials-bg, #F9F7F2)" }}
    >
      <AnimatedSection className="md:container md:mx-auto md:px-6">{banner}</AnimatedSection>
    </section>
  );
};

export default TestimonialsBanner;

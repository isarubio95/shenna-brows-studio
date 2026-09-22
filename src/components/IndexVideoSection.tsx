import AnimatedSection from "@/components/AnimatedSection";
import { splitHeadlineByAccent } from "@/lib/collection-headline-content";
import { useVideoAspectRatio } from "@/lib/video-aspect-ratio";
import {
  resolveIndexVideoPosterSrc,
  resolveIndexVideoUrl,
  type IndexVideoConfig,
} from "@/lib/video-content";

interface IndexVideoSectionProps {
  config: IndexVideoConfig;
  /** Vista previa en admin: sin animación de entrada. */
  preview?: boolean;
}

const IndexVideoSection = ({ config, preview = false }: IndexVideoSectionProps) => {
  const videoSrc = resolveIndexVideoUrl(config.videoUrl);
  const posterSrc = resolveIndexVideoPosterSrc(config);
  // El archivo subido manda: si no es 9/16 se enseña entero, sin recortarlo.
  const videoAspect = useVideoAspectRatio(videoSrc);
  const title = config.title.trim();
  const titleParts = splitHeadlineByAccent(title, config.accent);

  const heading = title ? (
    <>
      {titleParts ? (
        <>
          {titleParts.before}
          <span className="italic text-gold">{titleParts.accent}</span>
          {titleParts.after}
        </>
      ) : (
        title
      )}
    </>
  ) : null;

  const video = (
    <div className="mx-auto w-full max-w-80 sm:max-w-90 md:max-w-100">
      <div className="rounded-2xl overflow-hidden border border-gold/15 shadow-[0_12px_40px_rgba(0,0,0,0.12)] bg-carbon">
        <video
          className={videoAspect ? "w-full object-cover" : "w-full aspect-9/16 object-cover"}
          style={videoAspect ? { aspectRatio: String(videoAspect) } : undefined}
          src={videoSrc}
          poster={posterSrc}
          controls
          playsInline
          preload="metadata"
          controlsList="nodownload"
          aria-label={title || "Vídeo del tratamiento de cejas"}
        >
          Tu navegador no soporta la reproducción de video.
        </video>
      </div>
    </div>
  );

  if (preview) {
    return (
      <section
        className="rounded-xl px-4 py-8 sm:px-6"
        style={{ backgroundColor: "var(--theme-section-video-bg, #F9F7F2)" }}
      >
        {heading ? (
          <h2 className="font-playfair text-3xl md:text-4xl font-bold text-center leading-tight mb-6 max-w-4xl mx-auto">
            {heading}
          </h2>
        ) : null}
        {video}
      </section>
    );
  }

  return (
    <section
      id="video"
      className="py-16 md:py-20"
      style={{ backgroundColor: "var(--theme-section-video-bg, #F9F7F2)" }}
    >
      <div className="container mx-auto px-6">
        <AnimatedSection>
          {heading ? (
            <h2 className="font-playfair text-3xl md:text-4xl font-bold text-center leading-tight mb-8 md:mb-10 max-w-4xl mx-auto">
              {heading}
            </h2>
          ) : null}
        </AnimatedSection>
        <AnimatedSection delay={0.08}>{video}</AnimatedSection>
      </div>
    </section>
  );
};

export default IndexVideoSection;

import { useEffect, useState } from "react";
import AnimatedSection from "@/components/AnimatedSection";
import InstagramPostEmbed from "@/components/InstagramPostEmbed";
import { useSiteContent } from "@/hooks/use-site-content";
import { Loader2 } from "lucide-react";

const ABOUT_KEYS = ["about_section_1", "about_section_2", "about_section_3", "about_section_4"];

const VIDEO_POSTER_TIME = 2;

const FALLBACK_SECTIONS = [
  { title: "Donde la precisión se convierte en identidad", text: "Shenna BROWS nace de una obsesión: hacer las cejas bien. Después de años trabajando con manos reales, entendí que la herramienta marca la diferencia. No creemos en el exceso, creemos en la exactitud." },
  { title: "Fabricado donde la calidad es cultura", text: "Nuestras pinzas y tijeras están fabricadas con acero inoxidable italiano, seleccionado por su durabilidad, su peso y su capacidad de mantener el filo durante años. No elegimos materiales al azar — cada componente es una decisión consciente." },
  { title: "Diseñado desde la experiencia, no desde un escritorio", text: "Cada ángulo, cada curva, cada gramo de peso ha sido probado en sesiones reales. Shenna BROWS no es un producto de laboratorio — es el resultado de miles de cejas transformadas, de entender qué funciona cuando el vello es fino, cuando la piel es sensible, cuando el detalle importa." },
  { title: "Para quienes hacen de las cejas un arte", text: "No creamos herramientas para todos. Las creamos para quienes entienden que unas cejas bien hechas cambian un rostro completo. Para la profesional exigente, para la perfeccionista que no se conforma. Para ti." },
];

const About = () => {
  const { data: siteContent, loading } = useSiteContent(ABOUT_KEYS);
  const [videoPoster, setVideoPoster] = useState<string | null>(null);

  const sections = ABOUT_KEYS.map((key, i) => ({
    title: siteContent[key]?.title || FALLBACK_SECTIONS[i].title,
    text: siteContent[key]?.content || FALLBACK_SECTIONS[i].text,
  }));

  useEffect(() => {
    const video = document.createElement("video");
    video.crossOrigin = "anonymous";
    video.muted = true;
    video.preload = "metadata";
    const onLoadedData = () => {
      video.currentTime = VIDEO_POSTER_TIME;
    };
    const onSeeked = () => {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(video, 0, 0);
          setVideoPoster(canvas.toDataURL("image/jpeg", 0.9));
        }
      } finally {
        video.remove();
      }
    };
    video.addEventListener("loadeddata", onLoadedData);
    video.addEventListener("seeked", onSeeked);
    video.src = "/video-presentacion.mp4";
    video.load();
    return () => {
      video.removeEventListener("loadeddata", onLoadedData);
      video.removeEventListener("seeked", onSeeked);
      video.remove();
    };
  }, []);

  return (
    <main className="min-h-screen pt-28 pb-14" style={{ backgroundColor: "var(--theme-section-about-bg, #F9F7F2)" }}>
      <div className="container mx-auto px-6 max-w-6xl">
        <div className="flex flex-col lg:flex-row lg:items-start gap-8 lg:gap-12">
          <div className="w-full lg:w-[34%] lg:shrink-0 order-1">
            <div className="max-w-[320px] sm:max-w-[360px] mx-auto lg:mx-0 rounded-2xl overflow-hidden shadow-[0_12px_40px_rgba(0,0,0,0.12)] border border-gold/15 lg:sticky lg:top-28">
              <video
                className="w-full aspect-[9/16] object-cover"
                src="/video-presentacion.mp4"
                poster={videoPoster ?? undefined}
                autoPlay
                muted
                controls
                playsInline
                preload="metadata"
              >
                Tu navegador no soporta la reproducción de video.
              </video>
            </div>
          </div>

          <div className="w-full lg:flex-1 lg:min-w-0 order-2 text-center lg:text-left space-y-10 md:space-y-12">
            <AnimatedSection>
              <p className="text-gold text-sm uppercase tracking-[0.3em] font-medium mb-3">
                Nuestra historia
              </p>
              <h1 className="font-playfair text-4xl md:text-5xl lg:text-6xl font-bold text-carbon leading-tight">
                El Storytelling de<br />
                <span className="italic text-gold">Shenna BROWS</span>
              </h1>
            </AnimatedSection>

            {loading ? (
              <div className="flex justify-center py-8 lg:justify-start">
                <Loader2 className="h-6 w-6 animate-spin text-gold" />
              </div>
            ) : (
              sections.map((s, i) => (
                <AnimatedSection key={i} delay={i * 0.06}>
                  <article>
                    <h2 className="font-playfair text-2xl md:text-3xl font-semibold mb-4 leading-snug" style={{ color: "var(--theme-color-h2, #1A1A1A)" }}>
                      {s.title}
                    </h2>
                    <p className="text-lg leading-relaxed" style={{ color: "var(--theme-color-paragraph, #1A1A1A)", opacity: 0.6 }}>{s.text}</p>
                  </article>
                </AnimatedSection>
              ))
            )}
          </div>
        </div>

        <InstagramPostEmbed className="mt-14 md:mt-16 pt-12 border-t border-gold/15" />
      </div>
    </main>
  );
};

export default About;

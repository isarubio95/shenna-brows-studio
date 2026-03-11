import AnimatedSection from "@/components/AnimatedSection";
import { useSiteContent } from "@/hooks/use-site-content";
import { Loader2 } from "lucide-react";

const ABOUT_KEYS = ["about_section_1", "about_section_2", "about_section_3", "about_section_4"];

const FALLBACK_SECTIONS = [
  { title: "Donde la precisión se convierte en identidad", text: "Shenna BROWS nace de una obsesión: hacer las cejas bien. Después de años trabajando con manos reales, entendí que la herramienta marca la diferencia. No creemos en el exceso, creemos en la exactitud." },
  { title: "Fabricado donde la calidad es cultura", text: "Nuestras pinzas y tijeras están fabricadas con acero inoxidable italiano, seleccionado por su durabilidad, su peso y su capacidad de mantener el filo durante años. No elegimos materiales al azar — cada componente es una decisión consciente." },
  { title: "Diseñado desde la experiencia, no desde un escritorio", text: "Cada ángulo, cada curva, cada gramo de peso ha sido probado en sesiones reales. Shenna BROWS no es un producto de laboratorio — es el resultado de miles de cejas transformadas, de entender qué funciona cuando el vello es fino, cuando la piel es sensible, cuando el detalle importa." },
  { title: "Para quienes hacen de las cejas un arte", text: "No creamos herramientas para todos. Las creamos para quienes entienden que unas cejas bien hechas cambian un rostro completo. Para la profesional exigente, para la perfeccionista que no se conforma. Para ti." },
];

const About = () => {
  const { data: siteContent, loading } = useSiteContent(ABOUT_KEYS);

  const sections = ABOUT_KEYS.map((key, i) => ({
    title: siteContent[key]?.title || FALLBACK_SECTIONS[i].title,
    text: siteContent[key]?.content || FALLBACK_SECTIONS[i].text,
  }));

  return (
    <main className="min-h-screen pt-32 pb-24" style={{ backgroundColor: "var(--theme-section-about-bg, #F9F7F2)" }}>
      <div className="container mx-auto px-6 max-w-3xl">
        <AnimatedSection>
          <p className="text-gold text-sm uppercase tracking-[0.3em] font-medium text-center mb-4">
            Nuestra historia
          </p>
          <h1 className="font-playfair text-4xl md:text-5xl lg:text-6xl font-bold text-carbon text-center leading-tight mb-20">
            El Storytelling de<br />
            <span className="italic text-gold">Shenna BROWS</span>
          </h1>
        </AnimatedSection>

        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-gold" />
          </div>
        ) : (
          <div className="space-y-20">
            {sections.map((s, i) => (
              <AnimatedSection key={i} delay={i * 0.08}>
                <article>
                  <h2 className="font-playfair text-2xl md:text-3xl font-semibold mb-6 leading-snug" style={{ color: "var(--theme-color-h2, #1A1A1A)" }}>
                    {s.title}
                  </h2>
                  <p className="text-carbon/60 text-lg leading-relaxed">{s.text}</p>
                </article>
              </AnimatedSection>
            ))}
          </div>
        )}
      </div>
    </main>
  );
};

export default About;

import { Award, Sparkles, Heart } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import AnimatedSection from "@/components/AnimatedSection";
import ceoImg from "@/assets/alexandra-ceo.png";

const highlights = [
  {
    icon: Award,
    title: "Experiencia consolidada",
    text: "Más de una década perfeccionando el arte del diseño de cejas, formándose con los mejores profesionales de Europa.",
  },
  {
    icon: Sparkles,
    title: "Técnica de precisión",
    text: "Creadora de un método propio que fusiona visagismo, simetría facial y atención al mínimo detalle.",
  },
  {
    icon: Heart,
    title: "Pasión por la belleza real",
    text: "Cada producto nace de la convicción de que la elegancia está en el equilibrio, no en el exceso.",
  },
];

const CeoSection = () => (
  <section className="py-24" style={{ backgroundColor: "var(--theme-section-ceo-bg, #F9F7F2)" }}>
    <div className="container mx-auto px-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-12 md:gap-16 items-center max-w-5xl mx-auto">
        {/* Image */}
        <AnimatedSection>
          <div className="relative flex justify-center">
            {/* Decorative offset frame */}
            <div className="absolute top-4 -left-4 w-full h-full rounded-2xl border-2 border-primary/30" />
            <div className="relative rounded-2xl overflow-hidden shadow-[0_20px_60px_-15px_hsl(var(--primary)/0.25)]">
              <img
                src={ceoImg}
                alt="Alexandra – CEO & Fundadora de Shenna Brows"
                className="w-full max-w-md object-cover aspect-[3/4]"
                loading="lazy"
              />
            </div>
          </div>
        </AnimatedSection>

        {/* Text */}
        <AnimatedSection delay={0.15}>
          <div className="space-y-6">
            <Badge
              variant="outline"
              className="text-primary border-primary/40 uppercase tracking-[0.15em] text-xs font-medium"
            >
              CEO &amp; Fundadora
            </Badge>

            <h2 className="font-playfair text-3xl md:text-4xl font-bold text-foreground leading-tight">
              La visión detrás de{" "}
              <span className="italic text-primary">Shenna Brows</span>
            </h2>

            <p className="text-muted-foreground leading-relaxed">
              Alexandra es la mente creativa y la fuerza que impulsa cada
              producto de Shenna Brows. Su obsesión por la perfección y su
              mirada artística definen el ADN de la marca.
            </p>

            <ul className="space-y-5 pt-2">
              {highlights.map(({ icon: Icon, title, text }) => (
                <li key={title} className="flex gap-4">
                  <div className="flex-shrink-0 mt-1 w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center">
                    <Icon className="w-4 h-4 text-primary" strokeWidth={1.8} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground text-sm mb-0.5">
                      {title}
                    </h3>
                    <p className="text-muted-foreground text-sm leading-relaxed">
                      {text}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </AnimatedSection>
      </div>
    </div>
  </section>
);

export default CeoSection;

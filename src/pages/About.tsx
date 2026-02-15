import AnimatedSection from "@/components/AnimatedSection";

const sections = [
  {
    title: "Donde la precisión se convierte en identidad",
    text: "Shenna BROWS nace de una obsesión: hacer las cejas bien. Después de años trabajando con manos reales, entendí que la herramienta marca la diferencia. No creemos en el exceso, creemos en la exactitud.",
  },
  {
    title: "Fabricado donde la calidad es cultura",
    text: "Nuestras pinzas y tijeras están fabricadas con acero inoxidable italiano, seleccionado por su durabilidad, su peso y su capacidad de mantener el filo durante años. No elegimos materiales al azar — cada componente es una decisión consciente.",
  },
  {
    title: "Diseñado desde la experiencia, no desde un escritorio",
    text: "Cada ángulo, cada curva, cada gramo de peso ha sido probado en sesiones reales. Shenna BROWS no es un producto de laboratorio — es el resultado de miles de cejas transformadas, de entender qué funciona cuando el vello es fino, cuando la piel es sensible, cuando el detalle importa.",
  },
  {
    title: "Para quienes hacen de las cejas un arte",
    text: "No creamos herramientas para todos. Las creamos para quienes entienden que unas cejas bien hechas cambian un rostro completo. Para la profesional exigente, para la perfeccionista que no se conforma. Para ti.",
  },
];

const About = () => (
  <main className="min-h-screen bg-cream pt-32 pb-24">
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

      <div className="space-y-20">
        {sections.map((s, i) => (
          <AnimatedSection key={i} delay={i * 0.08}>
            <article>
              <h2 className="font-playfair text-2xl md:text-3xl font-semibold text-carbon mb-6 leading-snug">
                {s.title}
              </h2>
              <p className="text-carbon/60 text-lg leading-relaxed">{s.text}</p>
            </article>
          </AnimatedSection>
        ))}
      </div>
    </div>
  </main>
);

export default About;

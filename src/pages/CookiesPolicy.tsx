import AnimatedSection from "@/components/AnimatedSection";

const sections = [
  {
    title: "Qué son las cookies",
    text: "Las cookies son pequeños archivos de texto que los sitios web almacenan en tu dispositivo (ordenador, tablet o móvil) cuando los visitas. Permiten que la web recuerde tus preferencias, mejoren la experiencia y, en algunos casos, recopilen información de uso de forma anónima.",
  },
  {
    title: "Cookies que utilizamos",
    text: "En Shenna BROWS utilizamos cookies técnicas necesarias para el correcto funcionamiento de la tienda (sesión, carrito, preferencias básicas). Si nos das tu consentimiento, podemos usar cookies analíticas para entender cómo se usa la web y mejorar nuestros servicios. No utilizamos cookies para publicidad personalizada de terceros sin tu consentimiento explícito.",
  },
  {
    title: "Gestión de cookies",
    text: "Puedes configurar o rechazar las cookies no esenciales desde el aviso que aparece al visitar la web o desde la configuración de tu navegador. Las cookies técnicas son necesarias para que la compra y la navegación funcionen correctamente; si las desactivas, es posible que algunas funciones no estén disponibles.",
  },
  {
    title: "Más información",
    text: "Para cualquier duda sobre el uso de cookies o sobre tus datos personales, consulta nuestra Política de privacidad o escríbenos a info@shennabrows.com.",
  },
];

const CookiesPolicy = () => (
  <main className="min-h-screen bg-cream pt-32 pb-24">
    <div className="container mx-auto px-6 max-w-3xl">
      <AnimatedSection>
        <p className="text-gold text-sm uppercase tracking-[0.3em] font-medium text-center mb-4">
          Información legal
        </p>
        <h1 className="font-playfair text-4xl md:text-5xl font-bold text-carbon text-center leading-tight mb-4">
          Política de cookies
        </h1>
        <p className="text-carbon/50 text-sm text-center mb-16">
          Última actualización: {new Date().toLocaleDateString("es-ES", { year: "numeric", month: "long", day: "numeric" })}
        </p>
      </AnimatedSection>

      <div className="space-y-14">
        {sections.map((s, i) => (
          <AnimatedSection key={i} delay={i * 0.05}>
            <article>
              <h2 className="font-playfair text-xl md:text-2xl font-semibold text-carbon mb-4 leading-snug">
                {s.title}
              </h2>
              <p className="text-carbon/60 leading-relaxed">{s.text}</p>
            </article>
          </AnimatedSection>
        ))}
      </div>
    </div>
  </main>
);

export default CookiesPolicy;

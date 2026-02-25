import AnimatedSection from "@/components/AnimatedSection";

const sections = [
  {
    title: "Responsable del tratamiento",
    text: "Los datos personales que nos facilites serán tratados por Shenna BROWS. Puedes contactarnos en info@shennabrows.com para cualquier cuestión relacionada con la privacidad.",
  },
  {
    title: "Finalidad y legitimación",
    text: "Utilizamos tus datos para gestionar pedidos, envíos y la relación comercial; para enviar comunicaciones comerciales si nos has dado tu consentimiento; y para cumplir con obligaciones legales. La base legal es la ejecución del contrato, tu consentimiento o el interés legítimo cuando aplique.",
  },
  {
    title: "Datos que recogemos",
    text: "Recogemos los datos necesarios para procesar tu compra (nombre, dirección, email, teléfono) y, si creas cuenta, los que nos indiques en tu perfil. Los datos de pago son procesados de forma segura por nuestro proveedor de pagos y no los almacenamos completos.",
  },
  {
    title: "Conservación y cesión",
    text: "Conservamos tus datos mientras mantengamos una relación comercial o mientras sea necesario por obligaciones legales. No vendemos tus datos. Solo los compartimos con proveedores necesarios (envío, pasarela de pago) dentro del Espacio Económico Europeo y con las garantías adecuadas.",
  },
  {
    title: "Tus derechos",
    text: "Puedes acceder, rectificar y suprimir tus datos, oponerte a su tratamiento, limitarlo o solicitar su portabilidad. Tienes derecho a presentar una reclamación ante la autoridad de control (AEPD en España). Para ejercer tus derechos, escríbenos a info@shennabrows.com.",
  },
  {
    title: "Cookies",
    text: "Utilizamos cookies técnicas necesarias para el funcionamiento de la tienda y, si las aceptas, cookies analíticas. Puedes configurarlas en tu navegador o consultar nuestra política de cookies.",
  },
];

const PrivacyPolicy = () => (
  <main className="min-h-screen bg-cream pt-32 pb-24">
    <div className="container mx-auto px-6 max-w-3xl">
      <AnimatedSection>
        <p className="text-gold text-sm uppercase tracking-[0.3em] font-medium text-center mb-4">
          Información legal
        </p>
        <h1 className="font-playfair text-4xl md:text-5xl font-bold text-carbon text-center leading-tight mb-4">
          Política de privacidad
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

export default PrivacyPolicy;

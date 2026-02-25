import AnimatedSection from "@/components/AnimatedSection";

const sections = [
  {
    title: "Objeto y aceptación",
    text: "Estos términos y condiciones regulan el uso de la tienda online Shenna BROWS y la compra de productos a través de la misma. Al realizar un pedido, el usuario acepta estos términos. Si no estás de acuerdo, no debes utilizar este sitio ni realizar compras.",
  },
  {
    title: "Información del titular",
    text: "Shenna BROWS opera esta tienda online. Para cualquier consulta legal o comercial puedes dirigirte a info@shennabrows.com. Los datos de identificación fiscal y registro se encuentran disponibles en la web o pueden solicitarse por correo electrónico.",
  },
  {
    title: "Productos y precios",
    text: "Los productos ofrecidos se describen con la mayor exactitud posible. Los precios se muestran en euros (€) e incluyen IVA cuando sea aplicable. Nos reservamos el derecho de modificar precios y de limitar la disponibilidad de productos. En caso de error en precio o descripción, nos reservamos el derecho a cancelar el pedido y reembolsar el importe abonado.",
  },
  {
    title: "Pedidos y contratación",
    text: "Al confirmar el pedido, el usuario realiza una oferta de compra vinculante. La aceptación del contrato se produce cuando enviamos la confirmación del pedido por email. Nos reservamos el derecho a rechazar pedidos en caso de error, indisponibilidad del producto o motivos legítimos.",
  },
  {
    title: "Ley aplicable y resolución de conflictos",
    text: "Estos términos se rigen por la legislación española. Para cualquier controversia, las partes se someten a los juzgados y tribunales del domicilio del consumidor, sin perjuicio del derecho del consumidor a acudir a los mecanismos de resolución de conflictos en línea de la Unión Europea.",
  },
];

const TermsOfService = () => (
  <main className="min-h-screen bg-cream pt-32 pb-24">
    <div className="container mx-auto px-6 max-w-3xl">
      <AnimatedSection>
        <p className="text-gold text-sm uppercase tracking-[0.3em] font-medium text-center mb-4">
          Información legal
        </p>
        <h1 className="font-playfair text-4xl md:text-5xl font-bold text-carbon text-center leading-tight mb-4">
          Aviso legal y condiciones de uso
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

export default TermsOfService;

import AnimatedSection from "@/components/AnimatedSection";

const sections = [
  {
    title: "Derecho de desistimiento",
    text: "Tienes 14 días naturales desde la recepción del producto para desistir de la compra, sin necesidad de justificación. Debes informarnos de tu decisión de forma clara (por ejemplo, por email a info@shennabrows.com) antes de que finalice ese plazo.",
  },
  {
    title: "Devolución del producto",
    text: "El producto debe devolverse en el mismo estado en que lo recibiste, sin usar y en su embalaje original. Es importante que lo protejas correctamente para evitar daños durante el envío. Los gastos de devolución corren a tu cargo, salvo que el producto sea defectuoso o no corresponda al pedido.",
  },
  {
    title: "Reembolso",
    text: "Una vez recibido el artículo y comprobado su estado, procederemos al reembolso mediante el mismo método de pago utilizado en la compra. El reembolso se realizará en un plazo máximo de 14 días desde que confirmemos la recepción de la devolución. No se aplicarán gastos por el reembolso.",
  },
  {
    title: "Productos defectuosos",
    text: "Si recibes un producto defectuoso o que no coincide con tu pedido, ponte en contacto con nosotros de inmediato. En ese caso nos haremos cargo de los gastos de envío de la devolución y te enviaremos un producto en perfecto estado o procederemos al reembolso completo según prefieras.",
  },
  {
    title: "Contacto",
    text: "Para iniciar una devolución o resolver cualquier duda, escríbenos a info@shennabrows.com indicando tu número de pedido y el motivo. Te responderemos con las instrucciones concretas para completar la devolución.",
  },
];

const ReturnsPolicy = () => (
  <main className="min-h-screen bg-cream pt-32 pb-24">
    <div className="container mx-auto px-6 max-w-3xl">
      <AnimatedSection>
        <p className="text-gold text-sm uppercase tracking-[0.3em] font-medium text-center mb-4">
          Información legal
        </p>
        <h1 className="font-playfair text-4xl md:text-5xl font-bold text-carbon text-center leading-tight mb-4">
          Política de devoluciones
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

export default ReturnsPolicy;

import AnimatedSection from "@/components/AnimatedSection";

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

      <div className="space-y-10 text-carbon/70 leading-relaxed">
        <AnimatedSection delay={0.05}>
          <h2 className="font-playfair text-xl md:text-2xl font-semibold text-carbon mb-4 leading-snug">
            Condiciones generales de utilización del website
          </h2>
          <p>
            Los términos y condiciones recogidos en el presente Aviso Legal regulan el uso del sitio Web
            http://www.shennabrows.es/ que se pone a disposición de los usuarios que accedan a su Sitio Web con la
            finalidad de proporcionarles información sobre sus productos, así como la posibilidad de comprar los mismos.
          </p>
        </AnimatedSection>

        <AnimatedSection delay={0.1}>
          <h2 className="font-playfair text-xl md:text-2xl font-semibold text-carbon mb-4 leading-snug">
            Propiedad Intelectual e Industrial
          </h2>
          <p>
            La totalidad de este website: texto, imágenes, marca comercial, logotipo, archivos descargables, botones,
            combinaciones de colores, así como la estructura, selección, ordenación y presentación de sus contenidos, se
            encuentra protegida por las leyes españolas e internacionales sobre propiedad intelectual e industrial.
          </p>
          <p className="mt-2">
            Asimismo, y sin perjuicio de lo anteriormente citado, el contenido de este website también tiene la
            consideración de programa de ordenador y le es de aplicación toda la normativa española y comunitaria europea
            vigente sobre la materia.
          </p>
          <p className="mt-2">
            Queda expresamente prohibida la reproducción total o parcial de este website por parte del Usuario sin el permiso
            expreso y por escrito.
          </p>
        </AnimatedSection>

        <AnimatedSection delay={0.15}>
          <h2 className="font-playfair text-xl md:text-2xl font-semibold text-carbon mb-4 leading-snug">
            Limitación de Responsabilidad
          </h2>
          <p>
            Aunque tomemos todas las precauciones razonables para mantener la continuidad del sitio web, Internet no es
            siempre un medio estable y en cualquier momento pueden producirse errores, omisiones, interrupciones del servicio
            y retrasos. No asumimos ninguna obligación ni responsabilidad sobre el funcionamiento del sitio web o de cualquier
            parte del mismo.
          </p>
          <p className="mt-2">
            Nos reservamos el derecho a modificar la información del sitio web, en cualquier momento sin previo aviso. Si
            bien se tomarán todas las precauciones razonables para garantizar en la medida de lo posible que la información
            que contiene el sitio web sea exacta y veraz, no podemos garantizar su precisión.
          </p>
          <p className="mt-2">
            El usuario reconoce ser la única persona responsable del uso que hace del sitio web. Hacemos todo lo posible para
            garantizar que el software disponible para descargar en su página no contiene ningún virus, pero no puede
            garantizar su ausencia.
          </p>
          <p className="mt-2">
            No nos hacemos responsables por cualquier pérdida o daño sufrido por cualquier medio por el software u otros
            códigos, como los virus. El sitio contiene enlaces o vínculos a páginas externas. No asumimos ningún tipo de
            responsabilidad con respecto al contenido de esos sitios web, ni sus productos o servicios, incluyendo el uso que
            dichos sitios puedan hacer de la información personal de los usuarios.
          </p>
        </AnimatedSection>

        <AnimatedSection delay={0.2}>
          <h2 className="font-playfair text-xl md:text-2xl font-semibold text-carbon mb-4 leading-snug">
            Aceptación del aviso legal
          </h2>
          <p>
            La utilización del website implica la aceptación del presente Aviso Legal. Si tiene alguna duda sobre nuestro
            Aviso Legal, póngase en contacto con nosotros a través de la dirección arriba indicada.
          </p>
        </AnimatedSection>
      </div>
    </div>
  </main>
);

export default TermsOfService;

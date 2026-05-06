import AnimatedSection from "@/components/AnimatedSection";

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

      <div className="space-y-10 text-carbon/70 leading-relaxed">
        <AnimatedSection>
          <h2 className="font-playfair text-xl md:text-2xl font-semibold text-carbon mb-4 leading-snug">
            PROTECCIÓN DE DATOS DE CARÁCTER PERSONAL
          </h2>
          <p>
            SHENNA BROWS SL es el responsable del tratamiento de los datos personales del interesado y le informa que
            estos datos serán tratados de conformidad con lo dispuesto en la normativa vigente de protección de datos
            personales, el Reglamento (UE) 2016/679 del Parlamento Europeo y del Consejo, de 27 de abril de 2016 (en
            adelante, &ldquo;RGPD&rdquo;), relativo a la protección de las personas físicas en lo que respecta al tratamiento de
            datos personales y la Ley Orgánica 3/2018, de 5 de diciembre, de Protección de Datos Personales y garantía de
            los derechos digitales (en adelante, &ldquo;LOPD&rdquo;).
          </p>
        </AnimatedSection>

        <AnimatedSection delay={0.05}>
          <h3 className="font-playfair text-lg md:text-xl font-semibold text-carbon mb-3">1. Responsable del tratamiento:</h3>
          <p>Identidad: SHENNA BROWS SL</p>
          <p>Dirección Postal: C/Marques de Larios 6, 1º A, 26007 Logroño</p>
          <p>Correo electrónico: info@shennabrows.com</p>
          <p className="mt-3">
            Salvo que expresamente se indique lo contrario en el momento de recabarlos, todos los datos personales que se le
            soliciten son de obligada aportación al ser elementos indispensables para la gestión de su solicitud.
          </p>
          <p className="mt-2">
            Asimismo, usted confirma y garantiza la veracidad y exactitud de los datos aportados, y que éstos se ajustan a
            su estado actual.
          </p>
        </AnimatedSection>

        <AnimatedSection delay={0.1}>
          <h3 className="font-playfair text-lg md:text-xl font-semibold text-carbon mb-3">
            2. Finalidades del tratamiento y bases legitimadoras:
          </h3>
          <p>
            La finalidad de esta Web Site es informar sobre los servicios de SHENNA BROWS SL siendo el contenido de la misma
            y también es ecommerce, por lo tanto, para poder realizar la compra, se debe completar el formulario con datos
            personales.
          </p>
          <p className="mt-2">
            Las bases legitimadoras del tratamiento son la ejecución de la relación contractual para gestionar compras y
            pedidos, el consentimiento del interesado para finalidades que así lo requieran, el interés legítimo para atender
            consultas y mejorar la atención al cliente, y el cumplimiento de obligaciones legales aplicables.
          </p>
          <p className="mt-3">La información disponible en el site web es:</p>
          <ul className="list-disc pl-6 mt-2 space-y-1">
            <li>Informar de la trayectoria y experiencia</li>
            <li>Productos que se comercializan</li>
            <li>Ejemplos de casos realizados (antes y después)</li>
            <li>Testimonios de usuarios</li>
            <li>Blog</li>
            <li>Contacto</li>
          </ul>
          <p className="mt-3">
            El acceso y consulta al catálogo de productos publicados en el Sitio Web http://www.shennabrows.es/ tiene
            carácter libre y gratuito, no siendo necesario el registro de los usuarios.
          </p>
          <p className="mt-3 font-semibold text-carbon">Compra de productos</p>
          <p>
            Del mismo modo, para poder iniciar el proceso de compra de los productos expuestos en el Sitio Web, es esencial
            que los usuarios se registren o accedan como invitado, previa aceptación de las políticas de privacidad,
            facilitando los datos para poder realizar y tramitar la compra, así como el contacto que se solicite.
          </p>
          <p className="mt-3 font-semibold text-carbon">Formulario de contacto</p>
          <p>
            Los datos personales obtenidos a través del formulario de contacto de esta web serán utilizados para responder a
            las cuestiones planteadas y será tratada por la empresa de cara a poder proporcionarle la información solicitada
            y así resolver su consulta. Asimismo, le garantizamos que el mencionado tratamiento de datos personales se ampara
            en su interés legítimo y será llevado a cabo de conformidad con las exigencias del RGPD.
          </p>
        </AnimatedSection>

        <AnimatedSection delay={0.15}>
          <h3 className="font-playfair text-lg md:text-xl font-semibold text-carbon mb-3">
            3. Tiempo de conservación de los datos:
          </h3>
          <p>
            Los datos personales proporcionados a través del formulario de contacto se conservarán hasta que su relación con
            nosotros finalice, o hasta que su solicitud o consulta se haya realizado, tras lo cual sus datos serán
            debidamente bloqueados hasta que finalice el plazo de prescripción legal.
          </p>
          <p className="mt-2">
            En caso de compra de productos su información se archivará el tiempo necesario para cumplimiento de la legislación
            fiscal que afecte.
          </p>
        </AnimatedSection>

        <AnimatedSection delay={0.2}>
          <h3 className="font-playfair text-lg md:text-xl font-semibold text-carbon mb-3">4. Destinatarios:</h3>
          <p>Sus datos podrán ser comunicados a:</p>
          <ul className="list-disc pl-6 mt-2 space-y-1">
            <li>Las Administraciones Públicas en los casos previstos por la Ley.</li>
            <li>Las Fuerzas y Cuerpos de Seguridad del Estado y al Centro Nacional de Inteligencia en virtud de lo establecido en la Ley.</li>
          </ul>
        </AnimatedSection>

        <AnimatedSection delay={0.25}>
          <h3 className="font-playfair text-lg md:text-xl font-semibold text-carbon mb-3">5. Derechos:</h3>
          <p>
            Tiene derecho a ejercitar los derechos que le confiere el RGPD a través de sus artículos 15-22 (acceso,
            rectificación, oposición, limitación, portabilidad, derecho al olvido y a no ser objeto de decisiones
            automatizadas), mediante escrito dirigido al domicilio social o a través de la dirección de mail arriba indicada
            en el apartado del responsable del tratamiento. Igualmente, tiene derecho a revocar el consentimiento que ahora
            presta en cualquier momento.
          </p>
          <p className="mt-2">
            Asimismo, puede presentar una reclamación ante la Agencia Española de Protección de Datos a través de su web
            www.agpd.es o acudiendo a su sede localizada en la Calle Jorge Juan 6, Madrid.
          </p>
        </AnimatedSection>
      </div>
    </div>
  </main>
);

export default PrivacyPolicy;

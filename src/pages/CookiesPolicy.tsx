import AnimatedSection from "@/components/AnimatedSection";

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

      <div className="space-y-10 text-carbon/70 leading-relaxed">
        <AnimatedSection delay={0.05}>
          <p>
            Le informamos que durante la navegación por el sitio web se almacenan &laquo;cookies&raquo;, que son pequeños
            archivos de datos que se generan en el ordenador del usuario y que nos permiten conocer cómo es su navegación por
            nuestra web y la url de origen de la visita.
          </p>
          <p className="mt-2">
            La información obtenida es totalmente anónima y en ningún caso puede ser asociada a una persona concreta e
            identificada.
          </p>
        </AnimatedSection>

        <AnimatedSection delay={0.1}>
          <p>
            En general, estas tecnologías pueden servir para finalidades muy diversas, como, por ejemplo, reconocerle como
            usuario, obtener información sobre hábitos de navegación o personalizar la forma en la que se muestra el
            contenido de acuerdo con lo que indicamos en la primera capa de información proporcionada.
          </p>
          <p className="mt-2">
            No obstante, el usuario tiene la opción de impedir la generación de &laquo;cookies&raquo; mediante la selección de
            la correspondiente opción en su programa navegador. En la mayoría de los navegadores, se indica cómo configurar su
            navegador para que no acepte &laquo;cookies&raquo;, para que le notifique cada vez que reciba una nueva
            &laquo;cookie&raquo; y para desactivar todas las &laquo;cookies&raquo;.
          </p>
        </AnimatedSection>

        <AnimatedSection delay={0.15}>
          <h2 className="font-playfair text-xl md:text-2xl font-semibold text-carbon mb-4 leading-snug">Tipos de Cookies.</h2>
          <p>En particular, en función del plazo que permanecen activadas, las Cookies pueden dividirse en:</p>
          <ul className="list-disc pl-6 mt-2 space-y-1">
            <li>
              Cookies de sesión: Son cookies diseñadas para recabar y almacenar datos mientras el usuario accede a una página
              web. Se suelen emplear para almacenar información que solo interesa conservar para la prestación del servicio
              solicitado por el usuario en una sola ocasión.
            </li>
            <li>
              Cookies persistentes: Son un tipo de cookies en el que los datos siguen almacenados en el terminal y a los que
              se puede acceder y tratar durante un periodo definido por el responsable de la cookie, y que puede ir de unos
              minutos a varios años.
            </li>
          </ul>
          <p className="mt-3">
            Asimismo, en función de la finalidad para la que se traten los datos obtenidos y de quién las gestione, puede
            encontrarse con las siguientes Cookies en nuestra web:
          </p>
        </AnimatedSection>

        <AnimatedSection delay={0.2}>
          <h2 className="font-playfair text-xl md:text-2xl font-semibold text-carbon mb-4 leading-snug">
            Cookies utilizadas actualmente en esta web
          </h2>
          <ul className="list-disc pl-6 space-y-3">
            <li>
              <span className="font-semibold text-carbon">Cookies técnicas de seguridad (Cloudflare Turnstile):</span> cuando
              se activa el desafío anti-bots en el proceso de compra, Cloudflare puede instalar cookies técnicas como
              <span className="font-mono"> __cf_bm </span>
              y/o
              <span className="font-mono"> cf_clearance </span>
              para verificar que la navegación es legítima y prevenir abuso o fraude. Estas cookies son necesarias para la
              seguridad del servicio.
            </li>
            <li>
              <span className="font-semibold text-carbon">Cookies técnicas de pasarela de pago (Redsys):</span> al pulsar
              pagar, el usuario es redirigido al TPV virtual de Redsys. En ese entorno, Redsys puede instalar cookies propias
              necesarias para procesar la transacción y mantener la sesión de pago segura.
            </li>
            <li>
              <span className="font-semibold text-carbon">Analítica:</span> actualmente se utiliza Vercel Analytics para
              métricas agregadas de uso. Esta integración opera en modo respetuoso con la privacidad y, en términos generales,
              no requiere cookies de seguimiento publicitario del usuario.
            </li>
          </ul>
          <p className="mt-4">
            Las cookies de terceros (Cloudflare o Redsys) se gestionan conforme a sus propias políticas, por lo que su nombre
            exacto, duración y comportamiento pueden variar en función de la configuración técnica vigente en cada momento.
          </p>
        </AnimatedSection>
      </div>
    </div>
  </main>
);

export default CookiesPolicy;

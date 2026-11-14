import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { MailX } from "lucide-react";
import AnimatedSection from "@/components/AnimatedSection";
import { useHeroCtaStyle } from "@/hooks/use-hero-cta-style";
import { unsubscribeFromNewsletter } from "@/lib/newsletter";
import { siteCtaClass } from "@/lib/site-cta";

type Status = "idle" | "sending" | "done" | "error";

/**
 * Destino del enlace «Darme de baja» de los emails. Pide un clic para confirmar:
 * los antivirus de correo abren los enlaces solos y no deben dar de baja a nadie.
 */
const Unsubscribe = () => {
  const [params] = useSearchParams();
  const heroCtaStyle = useHeroCtaStyle();
  const email = (params.get("email") ?? "").trim().toLowerCase();
  const token = (params.get("token") ?? "").trim();
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState("");
  const linkIsComplete = Boolean(email && token);

  const confirm = async () => {
    setStatus("sending");
    try {
      await unsubscribeFromNewsletter(email, token);
      setStatus("done");
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo completar la baja.");
      setStatus("error");
    }
  };

  return (
    <main className="min-h-screen bg-cream pt-40 pb-24 flex items-center justify-center">
      <AnimatedSection>
        <div className="text-center max-w-md mx-auto px-6">
          <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gold/15 flex items-center justify-center">
            <MailX size={36} className="text-gold" />
          </div>

          {status === "done" ? (
            <>
              <h1 className="font-playfair text-3xl font-bold text-carbon mb-4">Te has dado de baja</h1>
              <p className="text-carbon/60 mb-8">
                Ya no recibirás la newsletter en <strong className="text-carbon/80">{email}</strong>. Los
                emails de tus pedidos te seguirán llegando.
              </p>
              <Link to="/" className={siteCtaClass()} style={heroCtaStyle}>
                Volver a la tienda
              </Link>
            </>
          ) : !linkIsComplete ? (
            <>
              <h1 className="font-playfair text-3xl font-bold text-carbon mb-4">Enlace incompleto</h1>
              <p className="text-carbon/60 mb-8">
                Usa el enlace «Darme de baja» del final de cualquier email de la newsletter, o escríbenos a{" "}
                <a href="mailto:info@shennabrows.com" className="text-gold hover:underline">
                  info@shennabrows.com
                </a>
                .
              </p>
            </>
          ) : (
            <>
              <h1 className="font-playfair text-3xl font-bold text-carbon mb-4">¿Darte de baja?</h1>
              <p className="text-carbon/60 mb-8">
                Dejarás de recibir la newsletter de Shenna Brows en{" "}
                <strong className="text-carbon/80">{email}</strong>.
              </p>
              {status === "error" ? <p className="mb-6 text-sm text-red-700">{error}</p> : null}
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <button
                  type="button"
                  onClick={confirm}
                  disabled={status === "sending"}
                  className={siteCtaClass("md", "disabled:opacity-60")}
                  style={heroCtaStyle}
                >
                  {status === "sending" ? "Un momento..." : "Sí, darme de baja"}
                </button>
                <Link to="/" className={siteCtaClass()} style={heroCtaStyle}>
                  Mejor no
                </Link>
              </div>
            </>
          )}
        </div>
      </AnimatedSection>
    </main>
  );
};

export default Unsubscribe;

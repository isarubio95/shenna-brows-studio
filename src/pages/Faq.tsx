import { useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import AnimatedSection from "@/components/AnimatedSection";
import FaqAnswer from "@/components/FaqAnswer";
import { useAuth } from "@/context/AuthContext";
import { useSiteContent } from "@/hooks/use-site-content";
import {
  FAQ_PAGE_PATH,
  getVisibleFaqSections,
  isPendingFaqAnswer,
  parseFaqConfig,
} from "@/lib/faq-content";
import NotFound from "@/pages/NotFound";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Loader2 } from "lucide-react";

const SEO_TITLE = "Preguntas frecuentes | Shenna Brows";
const SEO_DESCRIPTION =
  "Dudas sobre productos Shenna Brows, uso, pago y devoluciones. Si no encuentras tu respuesta, escríbenos y te ayudamos.";

const setMetaTag = (key: string, value: string, useProperty = false) => {
  const selector = useProperty ? `meta[property="${key}"]` : `meta[name="${key}"]`;
  let tag = document.head.querySelector(selector) as HTMLMetaElement | null;
  if (!tag) {
    tag = document.createElement("meta");
    if (useProperty) {
      tag.setAttribute("property", key);
    } else {
      tag.setAttribute("name", key);
    }
    document.head.appendChild(tag);
  }
  tag.setAttribute("content", value);
};

const setCanonical = (href: string) => {
  let tag = document.head.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
  if (!tag) {
    tag = document.createElement("link");
    tag.setAttribute("rel", "canonical");
    document.head.appendChild(tag);
  }
  tag.setAttribute("href", href);
};

const Faq = () => {
  const { data: siteContent, loading } = useSiteContent(["faq"]);
  const { isAdmin, loading: authLoading } = useAuth();
  const faq = useMemo(
    () => parseFaqConfig(siteContent.faq?.content),
    [siteContent.faq?.content],
  );
  const sections = useMemo(() => getVisibleFaqSections(faq), [faq]);
  const isPublic = faq.pageVisible;
  const canView = isPublic || isAdmin;
  const ready = !loading && !authLoading;

  useEffect(() => {
    if (!ready) return;
    if (!canView) {
      document.title = "Página no encontrada | Shenna Brows";
      setMetaTag("robots", "noindex, nofollow");
      return;
    }

    document.title = SEO_TITLE;
    setMetaTag("description", SEO_DESCRIPTION);
    setMetaTag("robots", isPublic ? "index, follow" : "noindex, nofollow");
    setMetaTag("og:title", SEO_TITLE, true);
    setMetaTag("og:description", SEO_DESCRIPTION, true);
    setMetaTag("og:type", "website", true);
    setMetaTag("twitter:card", "summary_large_image");
    setCanonical(`${window.location.origin}${FAQ_PAGE_PATH}`);
  }, [ready, canView, isPublic]);

  useEffect(() => {
    const scriptId = "faq-jsonld";
    const existing = document.getElementById(scriptId);
    if (existing) existing.remove();
    if (!ready || !isPublic) return;

    const entities = sections.flatMap((section) =>
      section.items
        .filter((faqItem) => !isPendingFaqAnswer(faqItem.answer))
        .map((faqItem) => ({
          "@type": "Question",
          name: faqItem.question,
          acceptedAnswer: {
            "@type": "Answer",
            text: faqItem.answer,
          },
        })),
    );

    if (entities.length === 0) return;

    const script = document.createElement("script");
    script.id = scriptId;
    script.type = "application/ld+json";
    script.text = JSON.stringify({
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: entities,
    });
    document.head.appendChild(script);

    return () => {
      document.getElementById(scriptId)?.remove();
    };
  }, [ready, isPublic, sections]);

  const isExternalCta = /^https?:\/\//i.test(faq.helpCtaHref) || faq.helpCtaHref.startsWith("mailto:");

  if (!ready) {
    return (
      <main className="min-h-screen bg-cream pt-40 pb-24">
        <div className="flex justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-gold" aria-label="Cargando preguntas" />
        </div>
      </main>
    );
  }

  if (!canView) {
    return <NotFound />;
  }

  return (
    <main className="min-h-screen bg-cream pt-40 pb-24">
      <div className="container mx-auto px-6 max-w-3xl">
        {!isPublic ? (
          <p className="mb-8 text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-center">
            Vista previa: esta página está oculta para el público.
          </p>
        ) : null}
        <AnimatedSection>
          <p className="text-gold text-sm uppercase tracking-[0.3em] font-medium text-center mb-4">
            {faq.eyebrow}
          </p>
          <h1 className="font-playfair text-4xl md:text-5xl font-bold text-carbon text-center leading-tight mb-4">
            {faq.title}
          </h1>
          {faq.intro ? (
            <p className="text-carbon/55 text-base md:text-lg text-center leading-relaxed mb-10">
              {faq.intro}
            </p>
          ) : (
            <div className="mb-10" />
          )}
        </AnimatedSection>

        {sections.length > 1 ? (
          <nav
            className="flex flex-wrap justify-center gap-2 mb-12"
            aria-label="Secciones de preguntas frecuentes"
          >
            {sections.map((section) => (
              <a
                key={section.id}
                href={`#faq-${section.id}`}
                className="inline-flex items-center rounded-full border border-gold/20 bg-white px-4 py-2 text-sm text-carbon/70 hover:border-gold/40 hover:text-carbon transition-colors"
              >
                {section.title}
              </a>
            ))}
          </nav>
        ) : null}

        <div className="space-y-14">
          {sections.map((section, sectionIndex) => (
            <AnimatedSection key={section.id} delay={sectionIndex * 0.04}>
              <section id={`faq-${section.id}`} className="scroll-mt-28">
                <h2 className="font-playfair text-2xl md:text-3xl font-semibold text-carbon mb-5">
                  {section.title}
                </h2>
                <Accordion type="single" collapsible className="bg-white rounded-2xl border border-gold/10 px-4 md:px-6">
                  {section.items.map((faqItem) => (
                    <AccordionItem
                      key={faqItem.id}
                      value={faqItem.id}
                      className="border-gold/10 last:border-b-0"
                    >
                      <AccordionTrigger className="text-left font-medium text-carbon hover:no-underline hover:text-gold py-5">
                        {faqItem.question}
                      </AccordionTrigger>
                      <AccordionContent>
                        <FaqAnswer
                          answer={faqItem.answer}
                          className="text-carbon/60 leading-relaxed text-sm md:text-base pb-2"
                        />
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </section>
            </AnimatedSection>
          ))}
        </div>

        <AnimatedSection delay={0.08}>
          <section className="mt-20 rounded-2xl border border-gold/15 bg-white px-6 py-10 md:px-10 text-center">
            <p className="text-gold text-sm uppercase tracking-[0.28em] font-medium mb-3">
              {faq.helpSubtitle}
            </p>
            <h2 className="font-playfair text-3xl md:text-4xl font-bold text-carbon mb-4">
              {faq.helpTitle}
            </h2>
            {faq.helpBody ? (
              <p className="text-carbon/60 leading-relaxed max-w-xl mx-auto mb-8">
                {faq.helpBody}
              </p>
            ) : null}
            {isExternalCta ? (
              <a
                href={faq.helpCtaHref}
                className="inline-flex items-center justify-center rounded-md bg-gold px-6 py-3 text-sm font-medium text-white hover:bg-gold/90 transition-colors"
              >
                {faq.helpCtaLabel}
              </a>
            ) : (
              <Link
                to={faq.helpCtaHref || "/tienda"}
                className="inline-flex items-center justify-center rounded-md bg-gold px-6 py-3 text-sm font-medium text-white hover:bg-gold/90 transition-colors"
              >
                {faq.helpCtaLabel}
              </Link>
            )}
          </section>
        </AnimatedSection>
      </div>
    </main>
  );
};

export default Faq;

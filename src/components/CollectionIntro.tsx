import type { CollectionIntroConfig } from "@/lib/collection-intro-content";

/** Título y subtítulo encima de la colección del inicio (editables en el panel). */
const CollectionIntro = ({ config }: { config: CollectionIntroConfig }) => (
  <>
    <h2
      className="font-playfair text-3xl md:text-4xl font-bold text-center mb-4"
      style={{ color: "var(--theme-color-h2, #1A1A1A)" }}
    >
      {config.title}
    </h2>
    {config.subtitle ? (
      <p
        className="text-center mb-12 md:mb-16 max-w-lg mx-auto"
        style={{ color: "var(--theme-color-paragraph, #1A1A1A)", opacity: 0.6 }}
      >
        {config.subtitle}
      </p>
    ) : (
      <div className="mb-8 md:mb-12" aria-hidden />
    )}
  </>
);

export default CollectionIntro;

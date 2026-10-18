import { useLocation } from "react-router-dom";
import BrandValues from "@/components/BrandValues";
import ReviewsCarousel from "@/components/ReviewsCarousel";
import TrustStrip from "@/components/TrustStrip";
import { layoutStorefrontBlocks, type StorefrontBlock } from "@/lib/storefront-sections";

function renderBlock(block: StorefrontBlock, placement: "top" | "bottom") {
  switch (block) {
    case "trust":
      return <TrustStrip key={block} dense={placement === "top"} />;
    case "values":
      return <BrandValues key={block} />;
    case "reviews":
      return <ReviewsCarousel key={block} />;
    default:
      return null;
  }
}

/**
 * Bloques comunes justo debajo del menú fijo, antes de la primera imagen de la
 * página. El hueco del menú lo reserva este bloque (`--site-header-height`), y
 * `index.css` reduce el margen superior de la página que viene detrás.
 */
export const StorefrontTopSections = () => {
  const { pathname } = useLocation();
  const { top } = layoutStorefrontBlocks(pathname);
  if (top.length === 0) return null;
  return (
    <div
      className="storefront-top-strip"
      style={{ paddingTop: "var(--site-header-height, 7rem)" }}
      data-storefront-sections="top"
    >
      {top.map((block) => renderBlock(block, "top"))}
    </div>
  );
};

/**
 * Bloques comunes al final de cada página de la tienda (layout). Qué páginas
 * los llevan lo decide `layoutStorefrontBlocks`; la home los coloca ella misma.
 */
const StorefrontSections = () => {
  const { pathname } = useLocation();
  const { bottom } = layoutStorefrontBlocks(pathname);
  if (bottom.length === 0) return null;
  return <div data-storefront-sections="bottom">{bottom.map((block) => renderBlock(block, "bottom"))}</div>;
};

export default StorefrontSections;

import { useLocation } from "react-router-dom";
import BrandValues from "@/components/BrandValues";
import ElixirSpotlight from "@/components/ElixirSpotlight";
import ReviewsCarousel from "@/components/ReviewsCarousel";
import TrustStrip from "@/components/TrustStrip";
import { useElixirSpotlight } from "@/hooks/use-elixir-spotlight";
import { layoutStorefrontBlocks, type StorefrontBlock } from "@/lib/storefront-sections";

function renderBlock(block: StorefrontBlock) {
  switch (block) {
    case "trust":
      return <TrustStrip key={block} />;
    case "values":
      return <BrandValues key={block} />;
    case "spotlight":
      return <ElixirSpotlight key={block} />;
    case "reviews":
      return <ReviewsCarousel key={block} />;
    default:
      return null;
  }
}

/**
 * Bloques comunes al final de cada página de la tienda (layout). Qué páginas
 * los llevan lo decide `layoutStorefrontBlocks`; la home los coloca ella misma.
 */
const StorefrontSections = () => {
  const { pathname } = useLocation();
  const { productSlug } = useElixirSpotlight();
  const blocks = layoutStorefrontBlocks(pathname, { spotlightSlug: productSlug });
  if (blocks.length === 0) return null;
  return <div data-storefront-sections>{blocks.map(renderBlock)}</div>;
};

export default StorefrontSections;

import { motion } from "framer-motion";
import { Plus, ShoppingCart, Sparkles } from "lucide-react";
import type { Database } from "@/integrations/supabase/types";
import AnimatedSection from "@/components/AnimatedSection";
import ProductImageGallery from "@/components/ProductImageGallery";
import { ProductPriceDisplay } from "@/components/ProductPriceDisplay";
import { ProductSaleBadge } from "@/components/ProductSaleBadge";
import { Button } from "@/components/ui/button";
import { useHeroCtaStyle } from "@/hooks/use-hero-cta-style";
import { getProductImageGallery } from "@/lib/product-images";
import { SITE_CTA_CLASS } from "@/lib/site-cta";
import { cn } from "@/lib/utils";

export type CatalogProduct = Database["public"]["Tables"]["products"]["Row"];

export interface ProductCardProps {
  product: CatalogProduct;
  delay: number;
  onOpenProduct: (slug: string) => void;
  onAddToCart: (product: CatalogProduct) => void;
  addToCartDisabled: boolean;
  /** Tarjeta resaltada para la sección de packs. */
  featured?: boolean;
  /** Cuadrícula de dos columnas en móvil: textos y márgenes más contenidos. */
  dense?: boolean;
}

/** Tarjeta del catálogo (tienda y home): galería, precio y botón de añadir. */
const ProductCard = ({
  product,
  delay,
  onOpenProduct,
  onAddToCart,
  addToCartDisabled,
  featured,
  dense = false,
}: ProductCardProps) => {
  const gallery = getProductImageGallery(product.image_url, product.slug);
  const outOfStock = Number(product.stock ?? 0) <= 0;
  const heroCtaStyle = useHeroCtaStyle();

  return (
    <AnimatedSection delay={delay} className="h-full">
      <motion.article
        whileHover={{ y: outOfStock ? -2 : -8 }}
        transition={{ duration: 0.3 }}
        className={`h-full rounded-2xl overflow-hidden border shadow-[0_6px_24px_rgba(0,0,0,0.05)] hover:shadow-[0_14px_40px_rgba(0,0,0,0.1)] transition-shadow duration-500 flex flex-col cursor-pointer ${
          outOfStock
            ? "bg-cream/80 border-carbon/20 ring-1 ring-carbon/10 opacity-[0.97]"
            : featured
              ? "bg-[linear-gradient(145deg,#fffef8_0%,#ffffff_45%,#fff9ec_100%)] border-gold/35 ring-1 ring-gold/25"
              : "bg-white border-gold/10"
        }`}
        role="link"
        tabIndex={0}
        onClick={() => onOpenProduct(product.slug)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onOpenProduct(product.slug);
          }
        }}
      >
        <div className="relative aspect-square bg-muted overflow-hidden">
          <ProductImageGallery
            images={gallery}
            alt={`${product.name} - Shenna Brows`}
            compact
            showDots
            // En la cuadrícula de dos columnas del móvil se pasa de foto deslizando.
            arrowClassName={dense ? "max-sm:hidden" : undefined}
            mediaClassName={`transition-transform duration-700 ${
              outOfStock ? "grayscale-[0.4] opacity-90" : "hover:scale-105"
            }`}
          />
          <ProductSaleBadge
            product={product}
            className={featured ? "left-3 top-12" : undefined}
          />
          {featured && (
            <span className="absolute left-3 top-3 z-10 inline-flex items-center gap-1 rounded-full bg-gold px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-white shadow-md">
              <Sparkles size={12} aria-hidden />
              Pack
            </span>
          )}
          {outOfStock && (
            <span className="absolute right-3 top-3 z-10 rounded-full bg-carbon px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-white shadow-md">
              Sin stock
            </span>
          )}
        </div>

        <div className={cn("flex-1 flex flex-col justify-between", dense ? "p-3.5 sm:p-6" : "p-6")}>
          <div>
            <p
              className={cn(
                "text-gold uppercase font-medium",
                dense
                  ? "text-[9px] tracking-[0.16em] mb-1.5 line-clamp-2 sm:text-xs sm:tracking-[0.2em] sm:mb-2"
                  : "text-xs tracking-[0.2em] mb-2",
              )}
            >
              {product.category}
            </p>
            <h3
              className={cn(
                "product-card-title font-playfair font-semibold text-carbon mb-1",
                dense ? "text-sm leading-snug sm:text-xl" : "text-xl",
              )}
            >
              {product.name}
            </h3>
            <p className={cn("text-carbon/60", dense ? "hidden sm:block text-sm" : "text-sm")}>
              {product.tagline}
            </p>
          </div>

          <div className={dense ? "mt-3 sm:mt-5" : "mt-5"}>
            <div className={cn("flex flex-wrap items-baseline gap-x-3 gap-y-1", dense ? "mb-3 sm:mb-4" : "mb-4")}>
              <ProductPriceDisplay product={product} muted={outOfStock} />
              {outOfStock && !addToCartDisabled && (
                <span className="text-xs font-semibold uppercase tracking-wider text-carbon/55">No disponible</span>
              )}
            </div>
            <div className="flex">
              <Button
                className={cn(SITE_CTA_CLASS, "w-full", dense && "px-2 tracking-[0.16em] sm:px-7 sm:tracking-[0.22em]")}
                style={heroCtaStyle}
                variant={outOfStock && !addToCartDisabled ? "outline" : "default"}
                onClick={(e) => {
                  e.stopPropagation();
                  onAddToCart(product);
                }}
                disabled={addToCartDisabled || outOfStock}
              >
                {addToCartDisabled ? (
                  <>
                    <span className="relative mr-2 inline-flex">
                      <ShoppingCart size={16} />
                      <Plus size={11} className="absolute -top-1 -right-1" />
                    </span>
                    Próximamente
                  </>
                ) : outOfStock ? (
                  "Sin stock"
                ) : (
                  <>
                    <span className="relative mr-2 inline-flex">
                      <ShoppingCart size={16} />
                      <Plus size={11} className="absolute -top-1 -right-1" />
                    </span>
                    Añadir
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </motion.article>
    </AnimatedSection>
  );
};

export default ProductCard;

import { Skeleton } from "@/components/ui/skeleton";
import ProductCard, { type CatalogProduct } from "@/components/ProductCard";
import { cn } from "@/lib/utils";

interface ProductGridProps {
  products: CatalogProduct[];
  loading?: boolean;
  /**
   * `packs`: tarjetas destacadas dentro de un marco, una o dos por fila.
   * `products`: cuadrícula sin deslizar, dos por fila en móvil.
   */
  variant: "packs" | "products";
  onOpenProduct: (slug: string) => void;
  onAddToCart: (product: CatalogProduct) => void;
  addToCartDisabled: boolean;
  className?: string;
}

const CardSkeleton = ({ dense }: { dense?: boolean }) => (
  <div className="bg-white/80 rounded-2xl overflow-hidden border border-gold/15 h-full">
    <Skeleton className="aspect-square" />
    <div className={cn("space-y-3", dense ? "p-3.5 sm:p-6" : "p-6")}>
      <Skeleton className="h-4 w-20" />
      <Skeleton className="h-6 w-full max-w-40" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-10 w-full mt-4" />
    </div>
  </div>
);

/** Catálogo en cuadrícula: todo a la vista, sin carruseles laterales. */
const ProductGrid = ({
  products,
  loading = false,
  variant,
  onOpenProduct,
  onAddToCart,
  addToCartDisabled,
  className,
}: ProductGridProps) => {
  if (variant === "packs") {
    return (
      <div
        className={cn(
          "rounded-3xl border border-gold/25 bg-[radial-gradient(ellipse_at_top,rgba(197,160,89,0.12),transparent_55%),linear-gradient(to_bottom,#fffdf8,#ffffff)] p-6 sm:p-10 shadow-[0_12px_40px_rgba(0,0,0,0.06)]",
          className,
        )}
      >
        <div
          className={
            !loading && products.length === 1
              ? "grid grid-cols-1 gap-8 max-w-lg mx-auto w-full"
              : "grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto"
          }
        >
          {loading
            ? Array.from({ length: 2 }).map((_, i) => <CardSkeleton key={`pack-skel-${i}`} />)
            : products.map((product, i) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  delay={i * 0.08}
                  onOpenProduct={onOpenProduct}
                  onAddToCart={onAddToCart}
                  addToCartDisabled={addToCartDisabled}
                  featured
                />
              ))}
        </div>
      </div>
    );
  }

  return (
    <ul
      className={cn(
        "grid grid-cols-2 gap-3 sm:gap-6 lg:grid-cols-3 xl:grid-cols-4 max-w-6xl mx-auto",
        className,
      )}
    >
      {loading
        ? Array.from({ length: 4 }).map((_, i) => (
            <li key={`product-skel-${i}`}>
              <CardSkeleton dense />
            </li>
          ))
        : products.map((product, i) => (
            <li key={product.id}>
              <ProductCard
                product={product}
                delay={Math.min(i, 6) * 0.05}
                onOpenProduct={onOpenProduct}
                onAddToCart={onAddToCart}
                addToCartDisabled={addToCartDisabled}
                dense
              />
            </li>
          ))}
    </ul>
  );
};

export default ProductGrid;

import { Tag } from "lucide-react";
import { isProductOnSale, type ProductPricingFields } from "@/lib/product-pricing";
import { cn } from "@/lib/utils";

type ProductSaleBadgeProps = {
  product: ProductPricingFields;
  className?: string;
};

/** Etiqueta de rebajas sobre la imagen del producto. */
export const ProductSaleBadge = ({ product, className }: ProductSaleBadgeProps) => {
  if (!isProductOnSale(product)) return null;

  return (
    <span
      className={cn(
        "absolute left-3 top-3 z-10 inline-flex items-center gap-1 rounded-full bg-red-500 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-white shadow-md",
        className,
      )}
      aria-label="En oferta"
    >
      <Tag size={12} aria-hidden className="rotate-[-12deg]" />
      Oferta
    </span>
  );
};

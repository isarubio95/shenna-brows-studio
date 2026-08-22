import { Tag } from "lucide-react";
import { isProductOnSale, type ProductPricingFields } from "@/lib/product-pricing";
import { cn } from "@/lib/utils";
import { useSiteBadges } from "@/hooks/use-site-badges";
import { DEFAULT_SALE_BADGE, type BadgeAppearance } from "@/lib/badges-content";

type SaleBadgeChipProps = BadgeAppearance & {
  className?: string;
};

/** Chip visual del badge de oferta (también usado en la vista previa del admin). */
export const SaleBadgeChip = ({
  text,
  background,
  textColor,
  className,
}: SaleBadgeChipProps) => (
  <span
    className={cn(
      "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider shadow-md",
      className,
    )}
    style={{ backgroundColor: background, color: textColor }}
    aria-label={text}
  >
    <Tag size={12} aria-hidden className="-rotate-12" />
    {text}
  </span>
);

type ProductSaleBadgeProps = {
  product: ProductPricingFields;
  className?: string;
};

/** Etiqueta de rebajas sobre la imagen del producto. */
export const ProductSaleBadge = ({ product, className }: ProductSaleBadgeProps) => {
  const { sale } = useSiteBadges();
  if (!isProductOnSale(product)) return null;

  return (
    <SaleBadgeChip
      text={sale.text || DEFAULT_SALE_BADGE.text}
      background={sale.background || DEFAULT_SALE_BADGE.background}
      textColor={sale.textColor || DEFAULT_SALE_BADGE.textColor}
      className={cn("absolute left-3 top-3 z-10", className)}
    />
  );
};

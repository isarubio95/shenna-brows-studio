import { cn } from "@/lib/utils";
import { getEffectivePrice, isProductOnSale, type ProductPricingFields } from "@/lib/product-pricing";

type ProductPriceDisplayProps = {
  product: ProductPricingFields;
  size?: "sm" | "md" | "lg";
  muted?: boolean;
  className?: string;
};

const sizeClasses = {
  sm: { current: "text-xs font-medium", original: "text-xs" },
  md: { current: "text-lg font-semibold", original: "text-sm" },
  lg: { current: "font-playfair text-3xl font-bold", original: "text-lg font-medium" },
};

export const ProductPriceDisplay = ({
  product,
  size = "md",
  muted = false,
  className,
}: ProductPriceDisplayProps) => {
  const onSale = isProductOnSale(product);
  const effective = getEffectivePrice(product);
  const classes = sizeClasses[size];

  if (!onSale) {
    return (
      <p
        className={cn(
          classes.current,
          muted ? "text-carbon/45" : "text-carbon",
          className,
        )}
      >
        €{effective.toFixed(2)}
      </p>
    );
  }

  return (
    <div className={cn("flex flex-wrap items-baseline gap-x-2 gap-y-0.5", className)}>
      <p className={cn(classes.current, muted ? "text-carbon/45" : "text-carbon")}>
        €{effective.toFixed(2)}
      </p>
      <p className={cn(classes.original, "text-red-500 line-through decoration-red-500/80")}>
        €{Number(product.price).toFixed(2)}
      </p>
    </div>
  );
};

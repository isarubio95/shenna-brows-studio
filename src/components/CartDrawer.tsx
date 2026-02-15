import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { useCart } from "@/context/CartContext";
import { Minus, Plus, Trash2, ShoppingBag, Truck } from "lucide-react";
import { Link } from "react-router-dom";
import { getShippingCost, FREE_SHIPPING_THRESHOLD } from "@/data/products";

const CartDrawer = () => {
  const { items, isOpen, closeCart, removeItem, updateQuantity, totalPrice } = useCart();

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && closeCart()}>
      <SheetContent className="bg-cream border-l border-gold/10 flex flex-col w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle className="font-playfair text-xl text-carbon">
            Tu Carrito
          </SheetTitle>
        </SheetHeader>

        {items.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-4 text-carbon/40">
            <ShoppingBag size={48} strokeWidth={1} />
            <p className="text-sm">Tu carrito está vacío</p>
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto space-y-4 py-4">
              {items.map((item) => (
                <div
                  key={item.product.id}
                  className="flex gap-4 p-3 rounded-lg bg-white/50 border border-gold/5"
                >
                  <div className="w-16 h-16 rounded-md bg-muted flex-shrink-0 overflow-hidden">
                    <img
                      src={item.product.image_url}
                      alt={item.product.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-medium text-carbon truncate">{item.product.name}</h4>
                    <p className="text-sm text-gold font-semibold mt-0.5">
                      €{item.product.price.toFixed(2)}
                    </p>
                    <div className="flex items-center gap-2 mt-2">
                      <button
                        onClick={() => updateQuantity(item.product.id, item.quantity - 1)}
                        className="w-6 h-6 flex items-center justify-center rounded border border-carbon/10 text-carbon/50 hover:border-gold hover:text-gold transition-colors"
                      >
                        <Minus size={12} />
                      </button>
                      <span className="text-sm font-medium text-carbon w-6 text-center">{item.quantity}</span>
                      <button
                        onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
                        className="w-6 h-6 flex items-center justify-center rounded border border-carbon/10 text-carbon/50 hover:border-gold hover:text-gold transition-colors"
                      >
                        <Plus size={12} />
                      </button>
                    </div>
                  </div>
                  <button
                    onClick={() => removeItem(item.product.id)}
                    className="text-carbon/30 hover:text-destructive transition-colors self-start"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>

            <div className="border-t border-gold/10 pt-4 space-y-3">
              {(() => {
                const shipping = getShippingCost(totalPrice);
                const remaining = FREE_SHIPPING_THRESHOLD - totalPrice;
                return (
                  <>
                    {remaining > 0 && (
                      <div className="flex items-center gap-2 text-xs text-carbon/50">
                        <Truck size={14} />
                        <span>Añade €{remaining.toFixed(2)} más para envío gratis</span>
                      </div>
                    )}
                    <div className="flex justify-between items-center text-sm text-carbon/60">
                      <span>Envío</span>
                      <span className={shipping === 0 ? "text-green-600 font-medium" : ""}>
                        {shipping === 0 ? "GRATIS" : `€${shipping.toFixed(2)}`}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-carbon/60">Total</span>
                      <span className="text-lg font-playfair font-bold text-carbon">
                        €{(totalPrice + shipping).toFixed(2)}
                      </span>
                    </div>
                  </>
                );
              })()}
              <Link to="/checkout" onClick={closeCart}>
                <Button className="w-full bg-gold hover:bg-gold/90 text-white font-medium tracking-wide">
                  Finalizar Compra
                </Button>
              </Link>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
};

export default CartDrawer;

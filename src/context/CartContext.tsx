import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from "react";
import { Product } from "@/data/products";
import { cartLineId, type ColorVariant } from "@/lib/color-variants";

export interface CartItem {
  lineId: string;
  product: Product;
  colorVariant: ColorVariant | null;
  quantity: number;
}

interface CartContextType {
  items: CartItem[];
  isOpen: boolean;
  isAddToCartDisabled: boolean;
  openCart: () => void;
  closeCart: () => void;
  addItem: (product: Product, colorVariant?: ColorVariant | null) => void;
  removeItem: (lineId: string) => void;
  updateQuantity: (lineId: string, quantity: number) => void;
  clearCart: () => void;
  totalItems: number;
  totalPrice: number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);
const IS_STORE_UNDER_CONSTRUCTION = import.meta.env.VITE_MANTEINANCE_MODE === "true";
const CART_HISTORY_STATE_KEY = "__shennaCartOpen";

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [items, setItems] = useState<CartItem[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const isOpenRef = useRef(isOpen);
  const closingFromHistoryRef = useRef(false);
  const pushedCartHistoryRef = useRef(false);

  const openCart = useCallback(() => setIsOpen(true), []);
  const closeCart = useCallback(() => setIsOpen(false), []);

  useEffect(() => {
    isOpenRef.current = isOpen;
  }, [isOpen]);

  useEffect(() => {
    const handlePopState = (event: PopStateEvent) => {
      if (event.state?.[CART_HISTORY_STATE_KEY]) {
        pushedCartHistoryRef.current = true;
        setIsOpen(true);
        return;
      }

      if (!isOpenRef.current) return;

      closingFromHistoryRef.current = true;
      pushedCartHistoryRef.current = false;
      setIsOpen(false);
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  useEffect(() => {
    if (isOpen) {
      if (window.history.state?.[CART_HISTORY_STATE_KEY]) {
        pushedCartHistoryRef.current = true;
      } else {
        window.history.pushState(
          { ...window.history.state, [CART_HISTORY_STATE_KEY]: true },
          "",
          window.location.href
        );
        pushedCartHistoryRef.current = true;
      }
      return;
    }

    if (closingFromHistoryRef.current) {
      closingFromHistoryRef.current = false;
      return;
    }

    if (pushedCartHistoryRef.current && window.history.state?.[CART_HISTORY_STATE_KEY]) {
      pushedCartHistoryRef.current = false;
      window.history.back();
    }
  }, [isOpen]);

  const addItem = useCallback((product: Product, colorVariant?: ColorVariant | null) => {
    if (IS_STORE_UNDER_CONSTRUCTION) return;

    const variant = colorVariant ?? product.selectedColorVariant ?? null;
    const lineId = cartLineId(product.id, variant?.id ?? null);

    setItems((prev) => {
      const existing = prev.find((i) => i.lineId === lineId);
      if (existing) {
        return prev.map((i) =>
          i.lineId === lineId ? { ...i, quantity: i.quantity + 1 } : i
        );
      }
      const { selectedColorVariant: _s, ...rest } = product;
      return [...prev, { lineId, product: { ...rest, selectedColorVariant: null }, colorVariant: variant, quantity: 1 }];
    });
    setIsOpen(true);
  }, []);

  const removeItem = useCallback((lineId: string) => {
    setItems((prev) => prev.filter((i) => i.lineId !== lineId));
  }, []);

  const updateQuantity = useCallback((lineId: string, quantity: number) => {
    if (quantity <= 0) {
      setItems((prev) => prev.filter((i) => i.lineId !== lineId));
      return;
    }
    setItems((prev) =>
      prev.map((i) => (i.lineId === lineId ? { ...i, quantity } : i))
    );
  }, []);

  const clearCart = useCallback(() => setItems([]), []);

  const totalItems = items.reduce((sum, i) => sum + i.quantity, 0);
  const totalPrice = items.reduce((sum, i) => sum + i.product.price * i.quantity, 0);

  return (
    <CartContext.Provider
      value={{
        items,
        isOpen,
        isAddToCartDisabled: IS_STORE_UNDER_CONSTRUCTION,
        openCart,
        closeCart,
        addItem,
        removeItem,
        updateQuantity,
        clearCart,
        totalItems,
        totalPrice,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
};

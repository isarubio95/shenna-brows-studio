import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from "react";
import { Product } from "@/data/products";
import { cartLineId, normalizeHex, type ColorVariant } from "@/lib/color-variants";

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
const CART_STORAGE_KEY = "shenna-brows-cart";

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const restoreString = (value: unknown) => (typeof value === "string" ? value : "");

const restoreProduct = (value: unknown): Product | null => {
  if (!isRecord(value)) return null;

  const {
    id,
    name,
    slug,
    price,
    stock,
  } = value;

  if (
    typeof id !== "string" ||
    typeof name !== "string" ||
    typeof slug !== "string" ||
    typeof price !== "number" ||
    !Number.isFinite(price) ||
    !id ||
    !name ||
    !slug
  ) {
    return null;
  }

  return {
    id,
    name,
    slug,
    category: restoreString(value.category),
    price,
    stock: typeof stock === "number" && Number.isFinite(stock) ? stock : 0,
    image_url: restoreString(value.image_url) || "/placeholder.svg",
    description: restoreString(value.description),
    materials: restoreString(value.materials),
    shipping_info: restoreString(value.shipping_info),
    tagline: restoreString(value.tagline),
    stripe_price_id: restoreString(value.stripe_price_id),
    selectedColorVariant: null,
  };
};

const restoreColorVariant = (value: unknown): ColorVariant | null => {
  if (value == null) return null;
  if (!isRecord(value)) return null;

  const { id, name, hex } = value;
  if (typeof id !== "string" || typeof name !== "string" || typeof hex !== "string") {
    return null;
  }

  const normalizedHex = normalizeHex(hex);
  if (!normalizedHex) return null;

  return { id, name, hex: normalizedHex };
};

const restoreCartItem = (value: unknown): CartItem | null => {
  if (!isRecord(value)) return null;

  const product = restoreProduct(value.product);
  const quantity = value.quantity;

  if (!product || typeof quantity !== "number" || !Number.isInteger(quantity) || quantity <= 0) {
    return null;
  }

  const colorVariant = restoreColorVariant(value.colorVariant);
  const lineId = cartLineId(product.id, colorVariant?.id ?? null);

  return { lineId, product, colorVariant, quantity };
};

const restoreCartItems = (): CartItem[] => {
  if (typeof window === "undefined") return [];

  try {
    const stored = window.localStorage.getItem(CART_STORAGE_KEY);
    if (!stored) return [];

    const parsed: unknown = JSON.parse(stored);
    if (!Array.isArray(parsed)) return [];

    return parsed.flatMap((item) => {
      const restored = restoreCartItem(item);
      return restored ? [restored] : [];
    });
  } catch {
    return [];
  }
};

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [items, setItems] = useState<CartItem[]>(restoreCartItems);
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
    try {
      if (items.length === 0) {
        window.localStorage.removeItem(CART_STORAGE_KEY);
        return;
      }

      window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
    } catch {
      // Si el navegador bloquea el almacenamiento, el carrito sigue funcionando durante la sesión.
    }
  }, [items]);

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

import { createContext, useContext, useState, useCallback, type ReactNode } from "react";
import type { CartItem, ProductVariant } from "./store";
import type { FeedProduct } from "./supabase-store";
import { cartItemKey } from "./store";

interface CartContextType {
  items: CartItem[];
  addToCart: (product: FeedProduct, variant: ProductVariant, quantity: number) => void;
  addManualItem: (name: string, originalPrice: number, sellingPrice: number, quantity: number, unit: string) => void;
  removeFromCart: (productId: string, variantId: string) => void;
  updateQuantity: (productId: string, variantId: string, quantity: number) => void;
  clearCart: () => void;
  total: number;
  itemCount: number;
}

const CartContext = createContext<CartContextType | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);

  const addToCart = useCallback((product: FeedProduct, variant: ProductVariant, quantity: number) => {
    setItems((prev) => {
      const key = cartItemKey(product.id, variant.id);
      const existing = prev.find((i) => cartItemKey(i.product.id, i.variant.id) === key);
      if (existing) {
        return prev.map((i) =>
          cartItemKey(i.product.id, i.variant.id) === key
            ? { ...i, quantity: i.quantity + quantity }
            : i
        );
      }
      return [...prev, { product, variant, quantity }];
    });
  }, []);

  const addManualItem = useCallback((name: string, originalPrice: number, sellingPrice: number, quantity: number, unit: string) => {
    const productId = `manual-${Date.now()}`;
    const variantId = `manual-variant-${Date.now()}`;
    const product: FeedProduct = {
      id: productId,
      name,
      category: "Lainnya",
      description: "",
      stock: 9999,
      unit,
      variants: [],
    };
    const variant: ProductVariant = {
      id: variantId,
      label: unit,
      originalPrice,
      sellingPrice,
      unit,
    };
    addToCart(product, variant, quantity);
  }, [addToCart]);

  const removeFromCart = useCallback((productId: string, variantId: string) => {
    const key = cartItemKey(productId, variantId);
    setItems((prev) => prev.filter((i) => cartItemKey(i.product.id, i.variant.id) !== key));
  }, []);

  const updateQuantity = useCallback((productId: string, variantId: string, quantity: number) => {
    const key = cartItemKey(productId, variantId);
    if (quantity <= 0) {
      setItems((prev) => prev.filter((i) => cartItemKey(i.product.id, i.variant.id) !== key));
      return;
    }
    setItems((prev) =>
      prev.map((i) =>
        cartItemKey(i.product.id, i.variant.id) === key ? { ...i, quantity } : i
      )
    );
  }, []);

  const clearCart = useCallback(() => setItems([]), []);

  const total = items.reduce((sum, item) => sum + item.variant.sellingPrice * item.quantity, 0);
  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <CartContext.Provider value={{ items, addToCart, addManualItem, removeFromCart, updateQuantity, clearCart, total, itemCount }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) throw new Error("useCart must be used within a CartProvider");
  return context;
}

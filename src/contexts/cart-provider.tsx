import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { discountedPrice } from "../helpers/formatters";
import { computeOrderSummary, findCouponPercent } from "../helpers/pricing";
import { storedCartSchema, type CartItem } from "../schemas/cart-schema";
import type { Product } from "../schemas/product-schema";
import { CartContext, type RemovedCartItem } from "./cart-context-value";

export const CART_KEY = "shop-catalog:cart";

function readStoredCart(): CartItem[] {
  try {
    const raw = localStorage.getItem(CART_KEY);
    const parsed = storedCartSchema.safeParse(raw ? JSON.parse(raw) : []);
    return parsed.success ? parsed.data : [];
  } catch {
    return [];
  }
}

export const COUPON_KEY = "shop-catalog:coupon";

/** Cupom salvo só vale se o código ainda existir (cupons podem ser removidos entre versões). */
function readStoredCoupon(): string | null {
  try {
    const code = localStorage.getItem(COUPON_KEY);
    return code && findCouponPercent(code) !== null ? code.toUpperCase() : null;
  } catch {
    return null;
  }
}

/** Limita a quantidade ao estoque conhecido (sem estoque informado, não há limite). */
const clampToStock = (quantity: number, stock: number | undefined) =>
  stock === undefined ? quantity : Math.min(quantity, stock);

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>(readStoredCart);
  const [couponCode, setCouponCode] = useState<string | null>(readStoredCoupon);

  useEffect(() => {
    try {
      if (couponCode) localStorage.setItem(COUPON_KEY, couponCode);
      else localStorage.removeItem(COUPON_KEY);
    } catch {
      // sem armazenamento: o cupom vale só nesta sessão
    }
  }, [couponCode]);

  const applyCoupon = useCallback((code: string): "applied" | "invalid" => {
    if (findCouponPercent(code) === null) return "invalid";
    setCouponCode(code.trim().toUpperCase());
    return "applied";
  }, []);

  const removeCoupon = useCallback(() => setCouponCode(null), []);

  useEffect(() => {
    try {
      localStorage.setItem(CART_KEY, JSON.stringify(items));
    } catch {
      // armazenamento indisponível: o carrinho segue apenas em memória
    }
  }, [items]);

  const addItem = useCallback((product: Product, quantity = 1) => {
    if (quantity < 1) return;
    setItems((current) => {
      const existing = current.find((item) => item.id === product.id);
      if (existing) {
        const limit = product.stock ?? existing.stock;
        return current.map((item) =>
          item.id === product.id
            ? { ...item, stock: limit, quantity: clampToStock(item.quantity + quantity, limit) }
            : item,
        );
      }
      const clamped = clampToStock(quantity, product.stock);
      if (clamped < 1) return current; // sem estoque: nada a adicionar
      return [
        ...current,
        {
          id: product.id,
          title: product.title,
          price: discountedPrice(product.price, product.discountPercentage),
          listPrice: product.price,
          thumbnail: product.thumbnail,
          stock: product.stock,
          quantity: clamped,
        },
      ];
    });
  }, []);

  const setQuantity = useCallback((id: number, quantity: number) => {
    setItems((current) =>
      quantity < 1
        ? current.filter((item) => item.id !== id)
        : current.map((item) =>
            item.id === id ? { ...item, quantity: clampToStock(quantity, item.stock) } : item,
          ),
    );
  }, []);

  const removeItem = useCallback((id: number) => {
    setItems((current) => current.filter((item) => item.id !== id));
  }, []);

  const clear = useCallback(() => setItems([]), []);

  const restoreItems = useCallback((entries: RemovedCartItem[]) => {
    setItems((current) => {
      const next = [...current];
      for (const { item, index } of [...entries].sort((a, b) => a.index - b.index)) {
        const existing = next.findIndex((candidate) => candidate.id === item.id);
        if (existing >= 0) {
          const merged = next[existing];
          next[existing] = {
            ...merged,
            quantity: clampToStock(merged.quantity + item.quantity, merged.stock),
          };
        } else {
          next.splice(Math.min(index, next.length), 0, item);
        }
      }
      return next;
    });
  }, []);

  const value = useMemo(
    () => ({
      items,
      totalItems: items.reduce((sum, item) => sum + item.quantity, 0),
      totalPrice: items.reduce((sum, item) => sum + item.price * item.quantity, 0),
      summary: computeOrderSummary(items, couponCode ? findCouponPercent(couponCode) : null),
      couponCode,
      applyCoupon,
      removeCoupon,
      addItem,
      setQuantity,
      removeItem,
      clear,
      restoreItems,
    }),
    [
      items,
      couponCode,
      addItem,
      setQuantity,
      removeItem,
      clear,
      restoreItems,
      applyCoupon,
      removeCoupon,
    ],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

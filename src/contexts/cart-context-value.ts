import { createContext } from "react";
import type { OrderSummary } from "../helpers/pricing";
import type { CartItem } from "../schemas/cart-schema";
import type { Product } from "../schemas/product-schema";

export interface RemovedCartItem {
  item: CartItem;
  /** Posição que o item ocupava na lista. */
  index: number;
}

export interface CartContextValue {
  items: CartItem[];
  totalItems: number;
  /** Subtotal (preços já com desconto dos produtos); o resumo completo está em `summary`. */
  totalPrice: number;
  summary: OrderSummary;
  couponCode: string | null;
  /** Aplica um cupom; "invalid" se o código não existir. */
  applyCoupon: (code: string) => "applied" | "invalid";
  removeCoupon: () => void;
  addItem: (product: Product, quantity?: number) => void;
  setQuantity: (id: number, quantity: number) => void;
  removeItem: (id: number) => void;
  clear: () => void;
  /** Recoloca itens removidos nas posições originais (soma a quantidade se já voltaram). */
  restoreItems: (entries: RemovedCartItem[]) => void;
}

export const CartContext = createContext<CartContextValue | null>(null);

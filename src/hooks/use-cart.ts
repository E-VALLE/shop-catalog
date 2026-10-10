import { useContext } from "react";
import { CartContext } from "../contexts/cart-context-value";

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error("useCart deve ser usado dentro de um <CartProvider>");
  }
  return context;
}

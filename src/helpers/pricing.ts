/** Regras (simuladas) de frete e cupom, em USD — a moeda dos dados da API. */
export const FREE_SHIPPING_MIN_USD = 50;
export const FLAT_SHIPPING_USD = 5.99;

/** Cupons de demonstração: código (sem diferenciar maiúsculas) → percentual de desconto. */
export const COUPONS: Readonly<Record<string, number>> = {
  BEMVINDO10: 10,
};

export function findCouponPercent(code: string): number | null {
  const percent = COUPONS[code.trim().toUpperCase()];
  return percent === undefined ? null : percent;
}

export interface OrderSummary {
  /** Soma dos preços de tabela (antes de qualquer desconto). */
  listSubtotal: number;
  /** Economia dos descontos dos próprios produtos. */
  discountSavings: number;
  /** Subtotal com os descontos dos produtos, antes do cupom. */
  subtotal: number;
  /** Desconto do cupom, sobre o subtotal. */
  couponSavings: number;
  shipping: number;
  total: number;
  /** Quanto falta (USD) para o frete grátis; 0 se já tem ou se o carrinho está vazio. */
  remainingForFreeShipping: number;
}

const cents = (value: number) => Math.round(value * 100) / 100;

export function computeOrderSummary(
  items: { price: number; listPrice?: number; quantity: number }[],
  couponPercent: number | null,
): OrderSummary {
  const listSubtotal = cents(
    items.reduce((sum, i) => sum + (i.listPrice ?? i.price) * i.quantity, 0),
  );
  const subtotal = cents(items.reduce((sum, i) => sum + i.price * i.quantity, 0));
  const discountSavings = cents(Math.max(listSubtotal - subtotal, 0));
  const couponSavings = couponPercent ? cents((subtotal * couponPercent) / 100) : 0;
  const afterCoupon = cents(subtotal - couponSavings);
  const hasItems = items.length > 0;
  const shipping = !hasItems || afterCoupon >= FREE_SHIPPING_MIN_USD ? 0 : FLAT_SHIPPING_USD;
  return {
    listSubtotal,
    discountSavings,
    subtotal,
    couponSavings,
    shipping,
    total: cents(afterCoupon + shipping),
    remainingForFreeShipping:
      !hasItems || shipping === 0 ? 0 : cents(FREE_SHIPPING_MIN_USD - afterCoupon),
  };
}

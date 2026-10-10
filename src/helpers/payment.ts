import type { OrderSummary } from "./pricing";

/** Formas de pagamento oferecidas (todas simuladas: nenhum pagamento é processado). */
export const PAYMENT_METHODS = ["pix", "card", "boleto"] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

/** Desconto por forma de pagamento, sobre os produtos já com cupom (o frete não entra). */
export const PAYMENT_DISCOUNT_PERCENT: Readonly<Record<PaymentMethod, number>> = {
  pix: 5,
  card: 0,
  boleto: 3,
};

/** Parcelamento sem juros: no máximo 12x e, como nas lojas reais, com parcela mínima. */
export const MAX_INSTALLMENTS = 12;
export const MIN_INSTALLMENT_USD = 5;

const toCents = (value: number) => Math.round(value * 100);
const cents = (value: number) => Math.round(value * 100) / 100;

/** Valor dos produtos depois do cupom (base do desconto por forma de pagamento). */
export const amountAfterCoupon = (summary: OrderSummary) =>
  cents(summary.subtotal - summary.couponSavings);

export function paymentDiscount(summary: OrderSummary, method: PaymentMethod): number {
  return cents((amountAfterCoupon(summary) * PAYMENT_DISCOUNT_PERCENT[method]) / 100);
}

/**
 * Total a pagar na forma escolhida. O frete grátis já foi decidido antes do desconto
 * (valor depois do cupom), então escolher Pix não faz o frete voltar a ser cobrado.
 */
export function payableTotal(summary: OrderSummary, method: PaymentMethod): number {
  return cents(summary.total - paymentDiscount(summary, method));
}

/** Quantas parcelas cabem: até 12x, sem deixar nenhuma abaixo da parcela mínima (mínimo 1). */
export function installmentLimit(total: number, minInstallment: number): number {
  if (minInstallment <= 0) return MAX_INSTALLMENTS;
  const fit = Math.floor(toCents(total) / toCents(minInstallment));
  return Math.max(1, Math.min(MAX_INSTALLMENTS, fit));
}

export interface InstallmentSplit {
  count: number;
  /** Valor da primeira parcela (absorve os centavos que sobram da divisão). */
  first: number;
  /** Valor de cada uma das demais parcelas. */
  rest: number;
  /** `true` quando todas as parcelas são iguais. */
  exact: boolean;
}

/** Divide o total em centavos inteiros: a soma das parcelas fecha exatamente com o total. */
export function splitInstallments(total: number, count: number): InstallmentSplit {
  const parts = Math.min(Math.max(Math.trunc(count), 1), MAX_INSTALLMENTS);
  const totalCents = toCents(total);
  const base = Math.floor(totalCents / parts);
  const remainder = totalCents - base * parts;
  return {
    count: parts,
    first: (base + remainder) / 100,
    rest: base / 100,
    exact: remainder === 0,
  };
}

const pad = (value: number, size: number) =>
  String(Math.abs(Math.trunc(value))).padStart(size, "0");

/** Número do pedido simulado, sempre com o prefixo SIM para não parecer um pedido real. */
export const orderNumber = (orderId: number) => `SIM-${pad(orderId, 5)}`;

/** Código "copia e cola" do Pix de demonstração: não é um código Pix válido. */
export const demoPixCode = (orderId: number) =>
  `00020126SIMULADO${pad(orderId, 5)}5204000053039865802BR6009DEMOSTRACAO6304FAKE`;

/** Linha digitável do boleto de demonstração: não corresponde a nenhum boleto pagável. */
export const demoBoletoLine = (orderId: number) =>
  `00000.00000 00000.000000 00000.000000 0 ${pad(orderId, 14)}`;

/** Sequência pseudoaleatória estável (mesma entrada, mesmo desenho) para a ilustração do QR. */
export function demoQrModules(seed: number, size = 21): boolean[][] {
  let state = (Math.trunc(seed) % 2_147_483_647) + 1;
  const next = () => {
    state = (state * 48_271) % 2_147_483_647;
    return state;
  };
  return Array.from({ length: size }, () => Array.from({ length: size }, () => next() % 3 === 0));
}

import { computeOrderSummary } from "./pricing";
import {
  MAX_INSTALLMENTS,
  PAYMENT_DISCOUNT_PERCENT,
  amountAfterCoupon,
  demoBoletoLine,
  demoPixCode,
  demoQrModules,
  installmentLimit,
  orderNumber,
  payableTotal,
  paymentDiscount,
  splitInstallments,
} from "./payment";

const summaryOf = (price: number, coupon: number | null = null) =>
  computeOrderSummary([{ price, quantity: 1 }], coupon);

describe("desconto por forma de pagamento", () => {
  it("Pix 5%, boleto 3% e cartão sem desconto", () => {
    expect(PAYMENT_DISCOUNT_PERCENT).toEqual({ pix: 5, card: 0, boleto: 3 });
    const summary = summaryOf(200); // frete grátis, total 200
    expect(paymentDiscount(summary, "pix")).toBe(10);
    expect(paymentDiscount(summary, "boleto")).toBe(6);
    expect(paymentDiscount(summary, "card")).toBe(0);
    expect(payableTotal(summary, "pix")).toBe(190);
    expect(payableTotal(summary, "boleto")).toBe(194);
    expect(payableTotal(summary, "card")).toBe(200);
  });

  it("incide sobre os produtos depois do cupom, não sobre o frete", () => {
    const summary = summaryOf(40, 10); // 36 após o cupom + frete 5,99 = 41,99
    expect(amountAfterCoupon(summary)).toBe(36);
    expect(summary.total).toBe(41.99);
    expect(paymentDiscount(summary, "pix")).toBe(1.8);
    expect(payableTotal(summary, "pix")).toBe(40.19);
  });

  it("o frete grátis é decidido antes do desconto (Pix não traz o frete de volta)", () => {
    const summary = summaryOf(51); // grátis (>= 50)
    expect(summary.shipping).toBe(0);
    expect(payableTotal(summary, "pix")).toBe(48.45); // abaixo de 50, e continua sem frete
  });

  it("arredonda para centavos", () => {
    expect(paymentDiscount(summaryOf(10.01), "pix")).toBe(0.5);
  });
});

describe("installmentLimit", () => {
  it("até 12x, respeitando a parcela mínima", () => {
    expect(installmentLimit(1000, 5)).toBe(12);
    expect(installmentLimit(60, 5)).toBe(12);
    expect(installmentLimit(59.99, 5)).toBe(11);
    expect(installmentLimit(20, 5)).toBe(4);
  });

  it("nunca menos de 1x, mesmo com total pequeno ou zero", () => {
    expect(installmentLimit(3, 5)).toBe(1);
    expect(installmentLimit(0, 5)).toBe(1);
  });

  it("sem mínimo válido, vale o teto de 12", () => {
    expect(installmentLimit(1, 0)).toBe(MAX_INSTALLMENTS);
  });
});

describe("splitInstallments", () => {
  it("divide igualmente quando dá certo", () => {
    expect(splitInstallments(936, 12)).toEqual({ count: 12, first: 78, rest: 78, exact: true });
    expect(splitInstallments(100, 1)).toEqual({ count: 1, first: 100, rest: 100, exact: true });
  });

  it("a primeira parcela absorve os centavos e a soma fecha com o total", () => {
    const split = splitInstallments(100, 3);
    expect(split).toEqual({ count: 3, first: 33.34, rest: 33.33, exact: false });
    expect(Math.round((split.first + split.rest * 2) * 100)).toBe(10000);
  });

  it.each([
    [0.01, 3],
    [999.99, 7],
    [1234.56, 12],
    [41.99, 5],
  ])("soma exata para %s em %sx", (total, count) => {
    const split = splitInstallments(total, count);
    const sum = Math.round(split.first * 100) + Math.round(split.rest * 100) * (count - 1);
    expect(sum).toBe(Math.round(total * 100));
  });

  it("limita a contagem entre 1 e 12", () => {
    expect(splitInstallments(100, 0).count).toBe(1);
    expect(splitInstallments(100, 99).count).toBe(12);
    expect(splitInstallments(100, 2.9).count).toBe(2);
  });
});

describe("códigos de demonstração", () => {
  it("número do pedido com prefixo SIM e zeros à esquerda", () => {
    expect(orderNumber(7)).toBe("SIM-00007");
    expect(orderNumber(48213)).toBe("SIM-48213");
  });

  it("Pix e boleto são determinísticos e marcados como simulados", () => {
    expect(demoPixCode(48213)).toBe(demoPixCode(48213));
    expect(demoPixCode(48213)).toContain("SIMULADO48213");
    expect(demoBoletoLine(48213)).toMatch(/^00000\.00000 00000\.000000 00000\.000000 0 0+48213$/);
  });

  it("o desenho do QR é estável por semente e tem o tamanho pedido", () => {
    const a = demoQrModules(123);
    expect(a).toHaveLength(21);
    expect(a.every((row) => row.length === 21)).toBe(true);
    expect(demoQrModules(123)).toEqual(a);
    expect(demoQrModules(124)).not.toEqual(a);
  });
});

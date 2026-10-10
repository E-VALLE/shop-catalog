import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Route, Routes } from "react-router";
import { CART_KEY, COUPON_KEY } from "../contexts/cart-provider";
import { FX_KEY } from "../contexts/currency-provider";
import {
  FLAT_SHIPPING_USD,
  FREE_SHIPPING_MIN_USD,
  computeOrderSummary,
  findCouponPercent,
} from "../helpers/pricing";
import { renderWithProviders } from "../test/render-with-providers";
import { Cart } from "./cart";

const item = (price: number, quantity = 1, listPrice?: number) => ({ price, quantity, listPrice });

describe("computeOrderSummary", () => {
  it("carrinho vazio: tudo zero e sem frete", () => {
    expect(computeOrderSummary([], null)).toEqual({
      listSubtotal: 0,
      discountSavings: 0,
      subtotal: 0,
      couponSavings: 0,
      shipping: 0,
      total: 0,
      remainingForFreeShipping: 0,
    });
  });

  it("separa preço de tabela, desconto dos produtos e subtotal", () => {
    const s = computeOrderSummary([item(90, 2, 100), item(20, 1, 20)], null);
    expect(s.listSubtotal).toBe(220);
    expect(s.subtotal).toBe(200);
    expect(s.discountSavings).toBe(20);
    expect(s.shipping).toBe(0); // 200 ≥ 50
    expect(s.total).toBe(200);
  });

  it("itens salvos por versões antigas (sem listPrice) não geram desconto fantasma", () => {
    const s = computeOrderSummary([item(30, 2)], null);
    expect(s.listSubtotal).toBe(60);
    expect(s.discountSavings).toBe(0);
  });

  it("cupom incide sobre o subtotal já com desconto", () => {
    const s = computeOrderSummary([item(90, 1, 100), item(110, 1)], 10);
    expect(s.subtotal).toBe(200);
    expect(s.couponSavings).toBe(20);
    expect(s.total).toBe(180);
  });

  it(`frete: ${FLAT_SHIPPING_USD} abaixo de ${FREE_SHIPPING_MIN_USD}, grátis a partir dele (limite inclusivo)`, () => {
    const below = computeOrderSummary([item(49.99)], null);
    expect(below.shipping).toBe(FLAT_SHIPPING_USD);
    expect(below.total).toBe(55.98);
    expect(below.remainingForFreeShipping).toBe(0.01);

    const exact = computeOrderSummary([item(FREE_SHIPPING_MIN_USD)], null);
    expect(exact.shipping).toBe(0);
    expect(exact.remainingForFreeShipping).toBe(0);
  });

  it("o cupom pode fazer o pedido perder o frete grátis (vale o valor após o cupom)", () => {
    const s = computeOrderSummary([item(52)], 10); // 52 − 5,20 = 46,80 < 50
    expect(s.shipping).toBe(FLAT_SHIPPING_USD);
    expect(s.total).toBe(52.79);
  });

  it("arredonda para centavos sem erros de ponto flutuante", () => {
    const s = computeOrderSummary([item(0.1, 3, 0.1)], null);
    expect(s.subtotal).toBe(0.3);
  });
});

describe("findCouponPercent", () => {
  it("ignora maiúsculas/minúsculas e espaços; código desconhecido é null", () => {
    expect(findCouponPercent(" bemvindo10 ")).toBe(10);
    expect(findCouponPercent("BEMVINDO10")).toBe(10);
    expect(findCouponPercent("PROMO99")).toBeNull();
    expect(findCouponPercent("")).toBeNull();
    expect(findCouponPercent("constructor")).toBeNull(); // sem herança de Object.prototype
  });
});

describe("Cart: resumo do pedido e cupom", () => {
  const seed = (items: object[]) => localStorage.setItem(CART_KEY, JSON.stringify(items));
  const line = (name: string, price = 100) => ({
    id: 1,
    title: "Mouse",
    price,
    listPrice: price + 10,
    thumbnail: "t",
    quantity: 1,
    ...{ name },
  });
  // cotação já em cache (5): os valores saem em reais desde a primeira renderização
  const renderCart = () => {
    localStorage.setItem(
      FX_KEY,
      JSON.stringify({ rate: 5, quotedAt: "2026-10-02T12:00:00.000Z", savedAt: Date.now() }),
    );
    return renderWithProviders(
      <Routes>
        <Route path="/carrinho" element={<Cart />} />
      </Routes>,
      { route: "/carrinho" },
    );
  };
  const summary = () => screen.getByRole("region", { name: "Resumo do pedido" });

  it("mostra subtotal de tabela, desconto dos produtos, frete grátis e total", () => {
    seed([line("a")]); // 100 (tabela 110), cotação 5
    renderCart();
    const box = within(summary());
    expect(box.getByText("Subtotal (preço de tabela)").parentElement).toHaveTextContent(
      "R$ 550,00",
    );
    expect(box.getByText("Descontos dos produtos").parentElement).toHaveTextContent("− R$ 50,00");
    expect(box.getByText("Frete").parentElement).toHaveTextContent("Grátis");
    expect(box.getByText("Você ganhou frete grátis!")).toBeInTheDocument();
    expect(box.getByText("Total (1 item)").parentElement).toHaveTextContent("R$ 500,00");
  });

  it("abaixo do mínimo cobra frete e diz quanto falta", () => {
    seed([line("a", 20)]);
    renderCart();
    const box = within(summary());
    expect(box.getByText("Frete").parentElement).toHaveTextContent("R$ 29,95"); // 5,99 × 5
    expect(box.getByText("Faltam R$ 150,00 para o frete grátis.")).toBeInTheDocument(); // (50−20) × 5
  });

  it("aplica o cupom (sem diferenciar maiúsculas), mostra a economia e permite remover", async () => {
    seed([line("a", 100)]);
    renderCart();
    await userEvent.type(screen.getByLabelText("Cupom de desconto"), "bemvindo10");
    await userEvent.click(screen.getByRole("button", { name: "Aplicar" }));

    const box = within(summary());
    expect(await box.findByText(/Cupom BEMVINDO10/)).toBeInTheDocument();
    expect(box.getByText(/Cupom BEMVINDO10/).closest("div")).toHaveTextContent("− R$ 50,00");
    expect(box.getByText("Total (1 item)").parentElement).toHaveTextContent("R$ 450,00");
    expect(localStorage.getItem(COUPON_KEY)).toBe("BEMVINDO10");

    await userEvent.click(box.getByRole("button", { name: "Remover cupom BEMVINDO10" }));
    expect(box.queryByText(/Cupom BEMVINDO10/)).not.toBeInTheDocument();
    expect(box.getByText("Total (1 item)").parentElement).toHaveTextContent("R$ 500,00");
    expect(localStorage.getItem(COUPON_KEY)).toBeNull();
  });

  it("cupom inválido mostra erro e não altera o total; digitar limpa o erro", async () => {
    seed([line("a", 100)]);
    renderCart();
    await userEvent.type(screen.getByLabelText("Cupom de desconto"), "PROMO99");
    await userEvent.click(screen.getByRole("button", { name: "Aplicar" }));
    expect(await screen.findByText("Cupom inválido")).toBeInTheDocument();
    expect(within(summary()).getByText("Total (1 item)").parentElement).toHaveTextContent(
      "R$ 500,00",
    );

    await userEvent.type(screen.getByLabelText("Cupom de desconto"), "X");
    expect(screen.queryByText("Cupom inválido")).not.toBeInTheDocument();
  });

  it("campo vazio não faz nada", async () => {
    seed([line("a")]);
    renderCart();
    await userEvent.click(screen.getByRole("button", { name: "Aplicar" }));
    expect(screen.queryByText("Cupom inválido")).not.toBeInTheDocument();
  });

  it("restaura o cupom salvo; cupom desconhecido salvo é descartado", () => {
    seed([line("a")]);
    localStorage.setItem(COUPON_KEY, "bemvindo10");
    const { unmount } = renderCart();
    expect(within(summary()).getByText(/Cupom BEMVINDO10/)).toBeInTheDocument();
    unmount();

    localStorage.setItem(COUPON_KEY, "VELHO50");
    renderCart();
    expect(within(summary()).queryByText(/Cupom/)).not.toBeInTheDocument();
  });
});

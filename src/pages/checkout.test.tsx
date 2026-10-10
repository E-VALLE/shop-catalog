import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Route, Routes } from "react-router";
import { CART_KEY, COUPON_KEY } from "../contexts/cart-provider";
import { TOKEN_KEY } from "../services/api";
import { renderWithProviders } from "../test/render-with-providers";
import { Checkout } from "./checkout";

// Cotação padrão dos testes: US$ 1 = R$ 5 (ver renderWithProviders).
const line = (id: number, price: number, quantity = 1) => ({
  id,
  title: `Produto ${id}`,
  price,
  thumbnail: "t.png",
  quantity,
});

const seed = (...items: ReturnType<typeof line>[]) =>
  localStorage.setItem(CART_KEY, JSON.stringify(items));

function renderCheckout() {
  localStorage.setItem(TOKEN_KEY, "tok");
  localStorage.setItem(
    "shop-catalog:user",
    JSON.stringify({
      id: 16,
      username: "averyp",
      firstName: "Avery",
      lastName: "Perez",
      role: "user",
    }),
  );
  return renderWithProviders(
    <Routes>
      <Route path="/checkout" element={<Checkout />} />
      <Route path="/carrinho" element={<h1>Carrinho vazio</h1>} />
    </Routes>,
    { route: "/checkout" },
  );
}

const summary = () => screen.getByRole("complementary", { name: "Resumo do pedido" });

describe("Checkout", () => {
  it("sem itens no carrinho, volta para o carrinho", () => {
    renderCheckout();
    expect(screen.getByRole("heading", { name: "Carrinho vazio" })).toBeInTheDocument();
  });

  it("cartão: sem campos de cartão, com aviso do motivo e o nome de quem está logado", async () => {
    seed(line(1, 100));
    const { container } = renderCheckout();

    expect(await screen.findByText(/nenhum pagamento será processado/i)).toBeInTheDocument();
    expect(screen.getByText("Não pedimos os dados do seu cartão.")).toBeInTheDocument();
    expect(screen.getByText(/campo seguro do processador de pagamentos/)).toBeInTheDocument();
    expect(screen.getByText("Avery Perez")).toBeInTheDocument();
    // a única entrada do bloco do cartão é a escolha de parcelas
    expect(screen.queryByLabelText(/número do cartão|validade|cvv|cvc/i)).not.toBeInTheDocument();
    const inputs = [...container.querySelectorAll("input")].filter((el) => el.type !== "hidden");
    expect(inputs).toHaveLength(1);
    expect(screen.getByRole("combobox", { name: "Parcelas" })).toBeInTheDocument();
  });

  it("Pix: 5% de desconto, QR ilustrativo e código de demonstração", async () => {
    seed(line(1, 100));
    renderCheckout();
    await userEvent.click(await screen.findByRole("radio", { name: /Pix/ }));

    expect(screen.getByText(/Este QR é só ilustração/)).toBeInTheDocument();
    expect(screen.getByTestId("demo-code")).toHaveTextContent(/SIMULADO\d{5}/);
    expect(await within(summary()).findByText("Desconto no Pix (5%)")).toBeInTheDocument();
    expect(within(summary()).getByText(/−\s*R\$\s*25,00/)).toBeInTheDocument();
    expect(within(summary()).getByText(/^R\$\s*475,00$/)).toBeInTheDocument(); // 100 − 5% = 95 → ×5
  });

  it("boleto: 3% de desconto e aviso de que é fictício", async () => {
    seed(line(1, 100));
    renderCheckout();
    await userEvent.click(await screen.findByRole("radio", { name: /Boleto/ }));

    expect(screen.getByText("Boleto fictício: não pode ser pago.")).toBeInTheDocument();
    expect(await within(summary()).findByText("Desconto no Boleto (3%)")).toBeInTheDocument();
    expect(within(summary()).getByText(/^R\$\s*485,00$/)).toBeInTheDocument();
  });

  it("cartão: até 12x sem juros, com a primeira parcela absorvendo os centavos", async () => {
    seed(line(1, 100));
    renderCheckout();
    await within(summary()).findAllByText(/^R\$\s*500,00$/); // cotação carregada

    await userEvent.click(screen.getByRole("combobox", { name: "Parcelas" }));
    const options = await screen.findAllByRole("option");
    expect(options).toHaveLength(12);
    expect(options[0]).toHaveTextContent("À vista: R$ 500,00");
    expect(options[2]).toHaveTextContent(
      /3x sem juros: 1ª de R\$\s*166,68 e as demais de R\$\s*166,66/,
    );
    expect(options[11]).toHaveTextContent(
      /12x sem juros: 1ª de R\$\s*41,74 e as demais de R\$\s*41,66/,
    );
    // 500 / 12 = 41,66 com 8 centavos de resto: a soma fecha com o total
    expect(41.74 + 41.66 * 11).toBeCloseTo(500, 2);
  });

  it("pedido pequeno não deixa parcelar abaixo da parcela mínima", async () => {
    seed(line(1, 12)); // R$ 60 + frete (US$ 5,99) → total em cartão R$ 89,95: 3x de no mínimo R$ 25
    renderCheckout();
    await within(summary()).findAllByText(/R\$/);
    await userEvent.click(screen.getByRole("combobox", { name: "Parcelas" }));
    expect((await screen.findAllByRole("option")).length).toBeLessThan(12);
    expect(screen.getAllByRole("option").length).toBeGreaterThanOrEqual(1);
  });

  it("revisão → alterar → confirmar: mostra o pedido simulado e esvazia carrinho e cupom", async () => {
    seed(line(1, 100));
    localStorage.setItem(COUPON_KEY, "BEMVINDO10");
    renderCheckout();

    await userEvent.click(await screen.findByRole("radio", { name: /Pix/ }));
    await userEvent.click(screen.getByRole("button", { name: "Continuar para a revisão" }));
    expect(await screen.findByRole("heading", { name: "Itens (1)", level: 2 })).toBeInTheDocument();
    expect(screen.getByText(/Ao confirmar, nenhuma cobrança é feita/)).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Alterar" }));
    expect(await screen.findByRole("radio", { name: /Pix/ })).toBeChecked(); // a escolha foi mantida
    await userEvent.click(screen.getByRole("button", { name: "Continuar para a revisão" }));

    await userEvent.click(
      await screen.findByRole("button", { name: "Confirmar pedido (simulado)" }),
    );
    expect(
      await screen.findByRole("heading", { name: "Pedido simulado realizado", level: 1 }),
    ).toBeInTheDocument();
    expect(screen.getByText(/^Pedido SIM-\d{5}$/)).toBeInTheDocument();
    expect(
      screen.getByText("Nenhum pagamento foi processado e nenhum dado foi guardado."),
    ).toBeInTheDocument();
    // 100 − 10% (cupom) = 90 − 5% (Pix) = 85,50 → ×5
    expect(screen.getByText(/Total:\s*R\$\s*427,50/)).toBeInTheDocument();
    expect(localStorage.getItem(CART_KEY)).toBe("[]");
    expect(localStorage.getItem(COUPON_KEY)).toBeNull();
  });
});

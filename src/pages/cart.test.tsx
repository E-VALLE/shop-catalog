import { act, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Route, Routes, useLocation } from "react-router";
import { CART_KEY } from "../contexts/cart-provider";
import i18n from "../i18n";
import { TOKEN_KEY } from "../services/api";
import { renderWithProviders } from "../test/render-with-providers";
import { Cart } from "./cart";

const item = { id: 1, title: "Mouse", price: 10, thumbnail: "t.png", quantity: 2 };

function LoginProbe() {
  const { state } = useLocation();
  return <p>login state: {JSON.stringify(state)}</p>;
}

function renderCart() {
  return renderWithProviders(
    <Routes>
      <Route path="/carrinho" element={<Cart />} />
      <Route path="/login" element={<LoginProbe />} />
      <Route path="/checkout" element={<h1>Página de checkout</h1>} />
      <Route path="/produtos/:id" element={<h1>Detalhes do produto</h1>} />
    </Routes>,
    { route: "/carrinho" },
  );
}

function signIn() {
  localStorage.setItem(TOKEN_KEY, "tok");
  localStorage.setItem(
    "shop-catalog:user",
    JSON.stringify({ id: 1, username: "u", firstName: "U", lastName: "S" }),
  );
}

describe("Cart checkout", () => {
  beforeEach(() => localStorage.setItem(CART_KEY, JSON.stringify([item])));

  it("sem sessão, leva ao login mantendo o carrinho", async () => {
    renderCart();
    await userEvent.click(screen.getByRole("button", { name: "Finalizar compra" }));

    expect(await screen.findByText(/login state:/)).toHaveTextContent(
      '{"from":"/checkout","checkout":true}',
    );
    expect(JSON.parse(localStorage.getItem(CART_KEY)!)).toEqual([item]);
  });

  it("com sessão, vai para a página de checkout e o carrinho continua intacto", async () => {
    signIn();
    renderCart();
    await userEvent.click(screen.getByRole("button", { name: "Finalizar compra" }));
    expect(await screen.findByRole("heading", { name: "Página de checkout" })).toBeInTheDocument();
    expect(JSON.parse(localStorage.getItem(CART_KEY)!)).toEqual([item]);
  });

  it("miniatura e título do item levam aos detalhes do produto", async () => {
    const { container } = renderCart();
    const titleLink = await screen.findByRole("link", { name: "Mouse" });
    expect(titleLink).toHaveAttribute("href", "/produtos/1");
    const imageLink = container.querySelector("a[aria-hidden='true']");
    expect(imageLink).toHaveAttribute("href", "/produtos/1");
    expect(imageLink).toHaveAttribute("tabindex", "-1");
    expect(screen.getAllByRole("link", { name: "Mouse" })).toHaveLength(1);
  });

  it("não navega para o checkout sozinho", () => {
    signIn();
    renderCart();
    expect(screen.queryByRole("heading", { name: "Página de checkout" })).not.toBeInTheDocument();
  });

  it("em pt-BR exibe os valores em reais com a cotação", async () => {
    renderCart();
    // US$ 10 × 5 = R$ 50 por unidade; 2 unidades = R$ 100 (espaço pode ser não separável)
    expect(await screen.findByText(/^R\$\s50,00 cada$/)).toBeInTheDocument();
    expect(screen.getAllByText(/^R\$\s100,00$/).length).toBeGreaterThan(0);
  });

  it("renderiza em inglês quando o idioma é en", async () => {
    await i18n.changeLanguage("en");
    renderCart();
    expect(screen.getByRole("heading", { name: "Cart", level: 1 })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Checkout" })).toBeInTheDocument();
    expect(screen.getByText("Total (2 items)")).toBeInTheDocument();
    expect(screen.getByText("$10.00 each")).toBeInTheDocument();
  });

  it("define o título da aba e o atualiza ao trocar de idioma", async () => {
    renderCart();
    expect(document.title).toBe("Carrinho · Shop Catalog");
    await act(() => i18n.changeLanguage("en"));
    expect(document.title).toBe("Cart · Shop Catalog");
  });
});

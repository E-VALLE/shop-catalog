import { act, renderHook, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { Route, Routes } from "react-router";
import { SkipLink } from "../components/skip-link";
import { CART_KEY, CartProvider } from "../contexts/cart-provider";
import { useCart } from "../hooks/use-cart";
import type { Product } from "../schemas/product-schema";
import * as productsService from "../services/products-service";
import { renderWithProviders } from "../test/render-with-providers";
import { Cart } from "./cart";
import { Home } from "./home";

const item = (id: number, quantity = 1) => ({
  id,
  title: `Item ${id}`,
  price: 10,
  thumbnail: "t.png",
  quantity,
});

describe("CartProvider.restoreItems", () => {
  const wrapper = ({ children }: { children: ReactNode }) => (
    <CartProvider>{children}</CartProvider>
  );

  function setup(initial: ReturnType<typeof item>[]) {
    localStorage.setItem(CART_KEY, JSON.stringify(initial));
    return renderHook(() => useCart(), { wrapper });
  }

  it("recoloca o item na posição original", () => {
    const { result } = setup([item(1), item(3)]);
    act(() => result.current.restoreItems([{ item: item(2), index: 1 }]));
    expect(result.current.items.map((i) => i.id)).toEqual([1, 2, 3]);
  });

  it("restaura vários itens (esvaziar) na ordem original", () => {
    const { result } = setup([]);
    act(() =>
      result.current.restoreItems([
        { item: item(3), index: 2 },
        { item: item(1), index: 0 },
        { item: item(2), index: 1 },
      ]),
    );
    expect(result.current.items.map((i) => i.id)).toEqual([1, 2, 3]);
  });

  it("posição além do fim vai para o final", () => {
    const { result } = setup([item(1)]);
    act(() => result.current.restoreItems([{ item: item(9), index: 50 }]));
    expect(result.current.items.map((i) => i.id)).toEqual([1, 9]);
  });

  it("se o produto já foi adicionado de novo, soma a quantidade em vez de duplicar", () => {
    const { result } = setup([item(1, 2)]);
    act(() => result.current.restoreItems([{ item: item(1, 3), index: 0 }]));
    expect(result.current.items).toHaveLength(1);
    expect(result.current.items[0].quantity).toBe(5);
  });

  it("lista vazia não altera o carrinho", () => {
    const { result } = setup([item(1)]);
    act(() => result.current.restoreItems([]));
    expect(result.current.items).toHaveLength(1);
  });
});

describe("Cart: desfazer remoção", () => {
  const renderCart = () =>
    renderWithProviders(
      <Routes>
        <Route path="/carrinho" element={<Cart />} />
      </Routes>,
      { route: "/carrinho" },
    );

  beforeEach(() => localStorage.setItem(CART_KEY, JSON.stringify([item(1), item(2), item(3)])));

  it("remover um item mostra o aviso e Desfazer devolve o item à mesma posição", async () => {
    renderCart();
    await userEvent.click(screen.getByRole("button", { name: "Remover Item 2" }));
    expect(screen.queryByRole("article", { name: "Item 2" })).not.toBeInTheDocument();
    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("Item 2 removido do carrinho.");
    // a frase de ação vem destacada (negrito), separada do nome do produto
    expect(within(alert).getByText("removido do carrinho")).toHaveStyle({ fontWeight: "700" });

    await userEvent.click(screen.getByRole("button", { name: "Desfazer" }));
    const names = screen.getAllByRole("article").map((a) => a.getAttribute("aria-label"));
    expect(names).toEqual(["Item 1", "Item 2", "Item 3"]);
  });

  it("esvaziar mostra o aviso com a contagem e Desfazer restaura tudo", async () => {
    renderCart();
    await userEvent.click(screen.getByRole("button", { name: "Esvaziar" }));
    expect(await screen.findByText("Seu carrinho está vazio")).toBeInTheDocument();
    expect(await screen.findByRole("alert")).toHaveTextContent("3 itens removidos do carrinho.");

    await userEvent.click(screen.getByRole("button", { name: "Desfazer" }));
    expect(screen.getAllByRole("article")).toHaveLength(3);
  });

  it("depois do Desfazer o aviso some (não restaura duas vezes)", async () => {
    renderCart();
    await userEvent.click(screen.getByRole("button", { name: "Remover Item 1" }));
    await userEvent.click(await screen.findByRole("button", { name: "Desfazer" }));
    await vi.waitFor(() =>
      expect(screen.queryByRole("button", { name: "Desfazer" })).not.toBeInTheDocument(),
    );
    expect(screen.getAllByRole("article")).toHaveLength(3);
  });
});

describe("Home: todas as categorias", () => {
  const CATEGORY_NAME = /^Cat \d+$/; // formatCategory("cat-1") → "Cat 1"
  const category = (n: number) => ({ slug: `cat-${n}`, name: `cat-${n}`, url: "" });

  function renderHome(total: number) {
    vi.spyOn(productsService, "listCategories").mockResolvedValue(
      Array.from({ length: total }, (_, i) => category(i + 1)),
    );
    vi.spyOn(productsService, "listProducts").mockResolvedValue({
      products: [
        {
          id: 1,
          title: "P",
          description: "d",
          category: "x",
          price: 1,
          thumbnail: "t",
          images: [],
        } as Product,
      ],
      total: 1,
      skip: 0,
      limit: 4,
    });
    return renderWithProviders(<Home />);
  }

  afterEach(() => vi.restoreAllMocks());

  it("mostra 12 categorias e um botão para ver todas, que alterna", async () => {
    renderHome(15);
    const toggle = await screen.findByRole("button", { name: "Ver todas as categorias (15)" });
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    expect(screen.getAllByRole("link", { name: CATEGORY_NAME })).toHaveLength(12);

    await userEvent.click(toggle);
    expect(screen.getAllByRole("link", { name: CATEGORY_NAME })).toHaveLength(15);
    expect(screen.getByRole("button", { name: "Mostrar menos" })).toHaveAttribute(
      "aria-expanded",
      "true",
    );

    await userEvent.click(screen.getByRole("button", { name: "Mostrar menos" }));
    expect(screen.getAllByRole("link", { name: CATEGORY_NAME })).toHaveLength(12);
  });

  it("com 12 ou menos categorias não mostra o botão", async () => {
    renderHome(12);
    await screen.findAllByRole("link", { name: CATEGORY_NAME });
    expect(
      screen.queryByRole("button", { name: /Ver todas as categorias/ }),
    ).not.toBeInTheDocument();
  });
});

describe("SkipLink", () => {
  function harness() {
    return renderWithProviders(
      <>
        <SkipLink />
        <nav>
          <a href="/x">outro link</a>
        </nav>
        <main id="main-content" tabIndex={-1}>
          conteúdo
        </main>
      </>,
    );
  }

  it("é o primeiro item da ordem de tabulação", async () => {
    harness();
    await userEvent.tab();
    expect(screen.getByRole("link", { name: "Pular para o conteúdo" })).toHaveFocus();
  });

  it("ao ativar, move o foco para o conteúdo principal sem mudar a URL", async () => {
    harness();
    const before = window.location.href;
    await userEvent.tab();
    await userEvent.keyboard("{Enter}");
    expect(document.getElementById("main-content")).toHaveFocus();
    expect(window.location.href).toBe(before);
  });
});

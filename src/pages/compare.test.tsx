import { act, renderHook, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { Route, Routes } from "react-router";
import { CompareBar } from "../components/compare-bar";
import { CompareButton } from "../components/compare-button";
import { MAX_COMPARE } from "../contexts/compare-context-value";
import { COMPARE_KEY, CompareProvider } from "../contexts/compare-provider";
import { bestIds } from "../helpers/compare";
import { useCompare } from "../hooks/use-compare";
import type { Product } from "../schemas/product-schema";
import * as productsService from "../services/products-service";
import { renderWithProviders } from "../test/render-with-providers";
import { Compare } from "./compare";

const make = (id: number, overrides: Partial<Product> = {}): Product => ({
  id,
  title: `Produto ${id}`,
  description: "d",
  category: "beauty",
  price: 10 * id,
  rating: 4,
  stock: 20,
  brand: "Acme",
  thumbnail: "t.png",
  images: [],
  ...overrides,
});

const wrapper = ({ children }: { children: ReactNode }) => (
  <CompareProvider>{children}</CompareProvider>
);

describe("CompareProvider", () => {
  it("lança erro fora do Provider", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() => renderHook(() => useCompare())).toThrow(/CompareProvider/);
    spy.mockRestore();
  });

  it("adiciona, remove e persiste", () => {
    const { result } = renderHook(() => useCompare(), { wrapper });
    act(() => {
      expect(result.current.toggle(1)).toBe("added");
    });
    act(() => {
      expect(result.current.toggle(2)).toBe("added");
    });
    expect(result.current.ids).toEqual([1, 2]);
    expect(JSON.parse(localStorage.getItem(COMPARE_KEY)!)).toEqual([1, 2]);

    act(() => {
      expect(result.current.toggle(1)).toBe("removed");
    });
    expect(result.current.ids).toEqual([2]);
  });

  it(`recusa o ${MAX_COMPARE + 1}º produto sem alterar a seleção`, () => {
    const { result } = renderHook(() => useCompare(), { wrapper });
    for (const id of [1, 2, 3]) act(() => void result.current.toggle(id));
    let outcome = "";
    act(() => {
      outcome = result.current.toggle(4);
    });
    expect(outcome).toBe("full");
    expect(result.current.ids).toEqual([1, 2, 3]);
    // mas ainda dá para remover um que já está lá
    act(() => {
      expect(result.current.toggle(2)).toBe("removed");
    });
  });

  it("restaura limitando a 3 e sem duplicados; ignora dados inválidos", () => {
    localStorage.setItem(COMPARE_KEY, JSON.stringify([1, 1, 2, 3, 4]));
    expect(renderHook(() => useCompare(), { wrapper }).result.current.ids).toEqual([1, 2, 3]);
    localStorage.setItem(COMPARE_KEY, "{ruim");
    expect(renderHook(() => useCompare(), { wrapper }).result.current.ids).toEqual([]);
  });

  it("remove e limpa", () => {
    const { result } = renderHook(() => useCompare(), { wrapper });
    act(() => void result.current.toggle(1));
    act(() => void result.current.toggle(2));
    act(() => result.current.remove(1));
    expect(result.current.ids).toEqual([2]);
    act(() => result.current.clear());
    expect(result.current.count).toBe(0);
  });
});

describe("bestIds", () => {
  const items = [make(1, { rating: 4.1 }), make(2, { rating: 4.9 }), make(3, { rating: 4.9 })];

  it("devolve os melhores, incluindo empates", () => {
    expect([...bestIds(items, (p) => p.rating, "max")].sort()).toEqual([2, 3]);
    expect([...bestIds(items, (p) => p.price, "min")]).toEqual([1]);
  });

  it("com menos de 2 produtos ou sem valores não destaca nada", () => {
    expect(bestIds([make(1)], (p) => p.price, "min").size).toBe(0);
    expect(bestIds(items, () => undefined, "max").size).toBe(0);
  });
});

describe("CompareButton e CompareBar", () => {
  it("alterna aria-pressed e mostra a barra com a contagem", async () => {
    renderWithProviders(
      <>
        <CompareButton product={{ id: 1, title: "Batom" }} />
        <CompareBar />
      </>,
    );
    expect(screen.queryByRole("complementary")).not.toBeInTheDocument();

    const button = screen.getByRole("button", { name: "Comparar Batom" });
    expect(button).toHaveAttribute("aria-pressed", "false");
    await userEvent.click(button);

    expect(screen.getByRole("button", { name: "Remover Batom da comparação" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    const bar = screen.getByRole("complementary", {
      name: "Produtos selecionados para comparação",
    });
    expect(bar).toHaveTextContent("1 produto selecionado (máx. 3)");
    expect(within(bar).getByRole("link", { name: "Comparar" })).toHaveAttribute(
      "href",
      "/comparar",
    );

    await userEvent.click(within(bar).getByRole("button", { name: "Limpar" }));
    expect(screen.queryByRole("complementary")).not.toBeInTheDocument();
  });

  it("avisa ao tentar passar do limite", async () => {
    localStorage.setItem(COMPARE_KEY, JSON.stringify([1, 2, 3]));
    renderWithProviders(<CompareButton product={{ id: 9, title: "Extra" }} />);
    await userEvent.click(screen.getByRole("button", { name: "Comparar Extra" }));
    expect(await screen.findByText("Você pode comparar no máximo 3 produtos.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Comparar Extra" })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
  });

  it("a barra não aparece na própria tela de comparação", () => {
    localStorage.setItem(COMPARE_KEY, JSON.stringify([1, 2]));
    renderWithProviders(<CompareBar />, { route: "/comparar" });
    expect(screen.queryByRole("complementary")).not.toBeInTheDocument();
  });
});

describe("Compare (página)", () => {
  afterEach(() => vi.restoreAllMocks());

  const catalog = [
    make(1, { price: 100, discountPercentage: 10, rating: 4.0, stock: 3 }),
    make(2, { price: 60, rating: 4.8, stock: 50, brand: undefined }),
    make(3, { price: 80, rating: 4.8, stock: 0 }),
  ];
  const mockApi = () =>
    vi.spyOn(productsService, "listProducts").mockResolvedValue({
      products: catalog,
      total: 3,
      skip: 0,
      limit: 0,
    });
  const renderPage = (ids: number[]) => {
    localStorage.setItem(COMPARE_KEY, JSON.stringify(ids));
    return renderWithProviders(
      <Routes>
        <Route path="/comparar" element={<Compare />} />
      </Routes>,
      { route: "/comparar" },
    );
  };

  it("sem produtos marcados mostra o estado vazio e não consulta a API", () => {
    const spy = mockApi();
    renderPage([]);
    expect(screen.getByText("Nenhum produto para comparar")).toBeInTheDocument();
    expect(spy).not.toHaveBeenCalled();
  });

  it("mostra a tabela lado a lado com os melhores valores destacados em texto", async () => {
    mockApi();
    renderPage([1, 2, 3]);
    const table = await screen.findByRole("table", { name: "Comparar produtos" });

    expect(within(table).getAllByRole("columnheader")).toHaveLength(4); // atributo + 3
    const priceRow = within(table).getByRole("row", { name: /Preço/ });
    expect(priceRow).toHaveTextContent("R$ 450,00"); // US$ 100 − 10% = 90 × 5
    expect(priceRow).toHaveTextContent("R$ 300,00");

    // destaques não dependem de cor: são selos com texto
    expect(within(table).getAllByText("Menor preço")).toHaveLength(1);
    expect(within(table).getAllByText("Melhor avaliação")).toHaveLength(2); // empate 4,8
    expect(within(table).getAllByText("Maior estoque")).toHaveLength(1);

    expect(within(table).getByText("Esgotado")).toBeInTheDocument();
    expect(within(table).getAllByText("—").length).toBeGreaterThan(0); // marca ausente
  });

  it("remover uma coluna atualiza a tabela; com 1 produto pede mais um", async () => {
    mockApi();
    renderPage([1, 2]);
    await screen.findByRole("table");
    await userEvent.click(screen.getByRole("button", { name: "Remover Produto 1 da comparação" }));
    expect(await screen.findByRole("status")).toHaveTextContent(
      "Marque pelo menos mais um produto para comparar.",
    );
    expect(screen.queryByText("Menor preço")).not.toBeInTheDocument(); // sem destaque com 1 só
  });

  it("comprar pela tabela adiciona ao carrinho; esgotado fica desabilitado", async () => {
    mockApi();
    renderPage([1, 3]);
    await screen.findByRole("table");
    expect(screen.getByRole("button", { name: "Adicionar Produto 3 ao carrinho" })).toBeDisabled();
    await userEvent.click(screen.getByRole("button", { name: "Adicionar Produto 1 ao carrinho" }));
    expect(JSON.parse(localStorage.getItem("shop-catalog:cart")!)[0]).toMatchObject({
      id: 1,
      price: 90,
    });
  });

  it("ids desconhecidos pela API viram estado vazio", async () => {
    mockApi();
    renderPage([999]);
    expect(await screen.findByText("Nenhum produto para comparar")).toBeInTheDocument();
  });

  it("erro da API mostra mensagem amigável", async () => {
    vi.spyOn(productsService, "listProducts").mockRejectedValue(new Error("boom"));
    renderPage([1]);
    expect(await screen.findByText(/erro inesperado/i)).toBeInTheDocument();
  });
});

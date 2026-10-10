import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  lowStockProducts,
  priceExtremes,
  productsByStock,
  productsInCategory,
} from "../helpers/dashboard-stats";
import type { Product } from "../schemas/product-schema";
import * as productsService from "../services/products-service";
import { renderWithProviders } from "../test/render-with-providers";
import { Dashboard } from "./dashboard";

const make = (
  id: number,
  title: string,
  category: string,
  stock: number | undefined,
  price = 10,
): Product => ({
  id,
  title,
  description: "d",
  category,
  price,
  stock,
  thumbnail: "t.png",
  images: [],
});

const catalog = [
  make(1, "Batom", "beauty", 3, 15),
  make(2, "Perfume", "beauty", 0, 120),
  make(3, "Sofá", "furniture", 40, 900),
  make(4, "Cadeira", "furniture", 5, 150),
  make(5, "Mesa", "furniture", 60, 400),
  make(6, "Caneta", "tablets", undefined, 2),
];
const ids = (list: Product[]) => list.map((p) => p.id);

describe("seletores do drill-down", () => {
  it("lowStockProducts: poucas unidades + esgotados, do mais crítico ao menos", () => {
    expect(ids(lowStockProducts(catalog))).toEqual([2, 1, 4]); // 0, 3, 5
  });

  it("productsByStock separa os três grupos do gráfico (e estoque desconhecido é 'em estoque')", () => {
    expect(ids(productsByStock(catalog, "out"))).toEqual([2]);
    expect(ids(productsByStock(catalog, "low"))).toEqual([1, 4]);
    expect(ids(productsByStock(catalog, "in")).sort()).toEqual([3, 5, 6]);
  });

  it("não altera a lista original", () => {
    const before = ids(catalog);
    lowStockProducts(catalog);
    productsByStock(catalog, "in");
    productsInCategory(catalog, "furniture");
    priceExtremes(catalog);
    expect(ids(catalog)).toEqual(before);
  });

  it("productsInCategory filtra e ordena por nome", () => {
    expect(productsInCategory(catalog, "furniture").map((p) => p.title)).toEqual([
      "Cadeira",
      "Mesa",
      "Sofá",
    ]);
    expect(productsInCategory(catalog, "inexistente")).toEqual([]);
  });

  it("priceExtremes devolve os N mais baratos (crescente) e os N mais caros (decrescente)", () => {
    const { cheapest, mostExpensive } = priceExtremes(catalog, 2);
    expect(ids(cheapest)).toEqual([6, 1]);
    expect(ids(mostExpensive)).toEqual([3, 5]);
  });

  it("com menos produtos que N, não quebra", () => {
    expect(priceExtremes([make(1, "A", "x", 1)], 5).cheapest).toHaveLength(1);
    expect(priceExtremes([], 5)).toEqual({ cheapest: [], mostExpensive: [] });
  });
});

describe("Dashboard: clicar nos painéis e no gráfico mostra os produtos", () => {
  afterEach(() => vi.restoreAllMocks());

  const renderDashboard = async (products = catalog) => {
    vi.spyOn(productsService, "listProducts").mockResolvedValue({
      products,
      total: products.length,
      skip: 0,
      limit: 0,
    });
    renderWithProviders(<Dashboard />);
    await screen.findByRole("img", { name: /Situação do estoque/ });
  };
  const dialog = () => screen.findByRole("dialog");
  const rowTitles = (root: HTMLElement) =>
    within(root)
      .getAllByRole("row")
      .slice(1)
      .map((row) => within(row).getAllByRole("link")[0].textContent);

  it("o painel 'Estoque baixo' abre a lista dos produtos que precisam de reposição", async () => {
    await renderDashboard();
    await userEvent.click(screen.getByRole("button", { name: /Estoque baixo \(≤5\): 3\./ }));

    const modal = await dialog();
    expect(
      within(modal).getByRole("heading", { name: "Produtos com estoque baixo" }),
    ).toBeInTheDocument();
    expect(rowTitles(modal)).toEqual(["Perfume", "Batom", "Cadeira"]); // esgotado primeiro
    expect(within(modal).getByText("3 produtos")).toBeInTheDocument();
    expect(within(modal).getByRole("link", { name: "Editar Perfume" })).toHaveAttribute(
      "href",
      "/admin/produtos/2/editar",
    );
    expect(within(modal).getByRole("link", { name: "Perfume" })).toHaveAttribute(
      "href",
      "/produtos/2",
    );
  });

  it("fecha com Escape e devolve o foco ao painel", async () => {
    await renderDashboard();
    const panel = screen.getByRole("button", { name: /Estoque baixo/ });
    await userEvent.click(panel);
    await dialog();
    await userEvent.keyboard("{Escape}");
    await vi.waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    await vi.waitFor(() => expect(panel).toHaveFocus()); // o foco volta depois da animação de saída
  });

  it("a legenda 'Poucas unidades' do gráfico abre só os produtos dessa situação", async () => {
    await renderDashboard();
    await userEvent.click(
      screen.getByRole("button", { name: /Poucas unidades \(≤5\): 2 produtos/ }),
    );
    const modal = await dialog();
    expect(
      within(modal).getByRole("heading", { name: "Poucas unidades (≤5)" }),
    ).toBeInTheDocument();
    expect(rowTitles(modal)).toEqual(["Batom", "Cadeira"]);
  });

  it("as outras legendas também funcionam (esgotados e em estoque)", async () => {
    await renderDashboard();
    await userEvent.click(screen.getByRole("button", { name: /Esgotado: 1 produtos/ }));
    expect(rowTitles(await dialog())).toEqual(["Perfume"]);
    await userEvent.keyboard("{Escape}");
    await vi.waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());

    await userEvent.click(screen.getByRole("button", { name: /Em estoque: 3 produtos/ }));
    expect(rowTitles(await dialog())).toHaveLength(3);
  });

  it("situação sem produtos mostra mensagem em vez de tabela vazia", async () => {
    await renderDashboard([make(1, "Sofá", "furniture", 40)]);
    await userEvent.click(screen.getByRole("button", { name: /Esgotado: 0 produtos/ }));
    const modal = await dialog();
    expect(within(modal).getByText("Nenhum produto nesta situação.")).toBeInTheDocument();
    expect(within(modal).queryByRole("table")).not.toBeInTheDocument();
  });

  it("'Produtos' lista todos por nome; 'Preço médio' mostra mais caros e mais baratos", async () => {
    await renderDashboard();
    await userEvent.click(screen.getByRole("button", { name: /^Produtos: 6\./ }));
    const all = await dialog();
    expect(rowTitles(all)).toEqual(["Batom", "Cadeira", "Caneta", "Mesa", "Perfume", "Sofá"]);
    await userEvent.keyboard("{Escape}");
    await vi.waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());

    await userEvent.click(screen.getByRole("button", { name: /^Preço médio:/ }));
    const prices = await dialog();
    expect(within(prices).getByRole("heading", { name: "Mais caros" })).toBeInTheDocument();
    expect(within(prices).getByRole("heading", { name: "Mais baratos" })).toBeInTheDocument();
    const tables = within(prices).getAllByRole("table");
    expect(rowTitles(tables[0])[0]).toBe("Sofá"); // mais caro
    expect(rowTitles(tables[1])[0]).toBe("Caneta"); // mais barato
  });

  it("'Categorias' lista com contagem e leva aos produtos de cada categoria", async () => {
    await renderDashboard();
    await userEvent.click(screen.getByRole("button", { name: /^Categorias: 3\./ }));
    const modal = await dialog();
    const furniture = within(modal).getByRole("row", { name: /Móveis/ });
    expect(furniture).toHaveTextContent("3");

    await userEvent.click(
      within(modal).getByRole("button", { name: "Ver produtos da categoria Móveis" }),
    );
    expect(
      await within(await dialog()).findByRole("heading", { name: "Categoria: Móveis" }),
    ).toBeInTheDocument();
    expect(rowTitles(await dialog())).toEqual(["Cadeira", "Mesa", "Sofá"]);
  });

  it("os painéis e legendas são botões acessíveis que anunciam o diálogo", async () => {
    await renderDashboard();
    for (const name of [/^Produtos:/, /^Categorias:/, /^Preço médio:/, /^Estoque baixo/]) {
      expect(screen.getByRole("button", { name })).toHaveAttribute("aria-haspopup", "dialog");
    }
    expect(screen.getByRole("button", { name: /Em estoque: 3 produtos/ })).toHaveAttribute(
      "aria-haspopup",
      "dialog",
    );
  });
});

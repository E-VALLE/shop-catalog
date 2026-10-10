import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "../test/render-with-providers";
import type { Product } from "../schemas/product-schema";
import * as productsService from "../services/products-service";
import { Products } from "./products";

const make = (id: number, title: string): Product => ({
  id,
  title,
  description: "d",
  category: "beauty",
  price: 10,
  thumbnail: "t.png",
  images: [],
});

describe("Products", () => {
  beforeEach(() => {
    vi.spyOn(productsService, "listCategories").mockResolvedValue([
      { slug: "beauty", name: "Beauty", url: "" },
    ]);
  });
  afterEach(() => vi.restoreAllMocks());

  it("lista produtos retornados pela API", async () => {
    vi.spyOn(productsService, "listProducts").mockResolvedValue({
      products: [make(1, "Batom"), make(2, "Perfume")],
      total: 2,
      skip: 0,
      limit: 12,
    });
    renderWithProviders(<Products />);
    expect(screen.getByRole("status")).toBeInTheDocument();
    expect(await screen.findByRole("article", { name: "Batom" })).toBeInTheDocument();
    expect(screen.getByRole("article", { name: "Perfume" })).toBeInTheDocument();
  });

  it("mostra estado vazio quando a busca não retorna resultados", async () => {
    vi.spyOn(productsService, "listProducts").mockResolvedValue({
      products: [],
      total: 0,
      skip: 0,
      limit: 12,
    });
    renderWithProviders(<Products />);
    expect(await screen.findByText("Nenhum produto encontrado")).toBeInTheDocument();
  });

  it("mostra mensagem amigável quando a API falha", async () => {
    vi.spyOn(productsService, "listProducts").mockRejectedValue(new Error("boom"));
    renderWithProviders(<Products />);
    expect(await screen.findByText(/erro inesperado/i)).toBeInTheDocument();
  });

  it("não exibe paginação com uma única página e busca após o debounce", async () => {
    const list = vi.spyOn(productsService, "listProducts").mockResolvedValue({
      products: [make(1, "Batom")],
      total: 1,
      skip: 0,
      limit: 12,
    });
    renderWithProviders(<Products />);
    await screen.findByRole("article", { name: "Batom" });
    expect(screen.queryByRole("navigation")).not.toBeInTheDocument();

    await userEvent.type(screen.getByRole("searchbox", { name: /buscar/i }), "bat");
    // debounce de 400 ms + digitação: folga para máquinas lentas
    await vi.waitFor(
      () => expect(list).toHaveBeenLastCalledWith(expect.objectContaining({ search: "bat" })),
      { timeout: 4000 },
    );
  });

  describe("filtro de marca", () => {
    const empty = { products: [], total: 0, skip: 0, limit: 12 };

    it("mostra o filtro ativo, repassa a marca à API e permite remover", async () => {
      const list = vi.spyOn(productsService, "listProducts").mockResolvedValue({
        products: [make(1, "Batom")],
        total: 1,
        skip: 0,
        limit: 12,
      });
      renderWithProviders(<Products />, { route: "/produtos?categoria=beauty&marca=Knoll" });
      expect(await screen.findByText("Marca: Knoll")).toBeInTheDocument();
      expect(list).toHaveBeenCalledWith(
        expect.objectContaining({ category: "beauty", brand: "Knoll" }),
      );

      await userEvent.click(screen.getByRole("button", { name: "Remover filtro de marca Knoll" }));
      await vi.waitFor(() => expect(screen.queryByText("Marca: Knoll")).not.toBeInTheDocument());
      expect(list).toHaveBeenLastCalledWith(expect.objectContaining({ brand: null }));
    });

    it("sem resultados na categoria, oferece ver todos da marca", async () => {
      const list = vi.spyOn(productsService, "listProducts").mockResolvedValue(empty);
      renderWithProviders(<Products />, { route: "/produtos?categoria=beauty&marca=Knoll" });
      await userEvent.click(
        await screen.findByRole("button", { name: "Ver todos os produtos da marca Knoll" }),
      );
      await vi.waitFor(() =>
        expect(list).toHaveBeenLastCalledWith(
          expect.objectContaining({ category: null, brand: "Knoll" }),
        ),
      );
    });

    it("sem categoria selecionada não oferece o atalho redundante", async () => {
      vi.spyOn(productsService, "listProducts").mockResolvedValue(empty);
      renderWithProviders(<Products />, { route: "/produtos?marca=Knoll" });
      await screen.findByText("Nenhum produto encontrado");
      expect(
        screen.queryByRole("button", { name: /Ver todos os produtos da marca/ }),
      ).not.toBeInTheDocument();
    });
  });

  describe("experiência de carregamento e navegação", () => {
    const many = (n: number) => Array.from({ length: n }, (_, i) => make(i + 1, `Item ${i + 1}`));

    it("mostra skeletons acessíveis (status ocupado) enquanto carrega", () => {
      vi.spyOn(productsService, "listProducts").mockReturnValue(new Promise(() => {}));
      renderWithProviders(<Products />);
      const status = screen.getByRole("status", { name: "Carregando produtos..." });
      expect(status).toHaveAttribute("aria-busy", "true");
      expect(status.children).toHaveLength(12); // mesma quantidade de cards da página
    });

    it("define o título da aba (com a categoria quando filtrada)", async () => {
      vi.spyOn(productsService, "listProducts").mockResolvedValue({
        products: [make(1, "Batom")],
        total: 1,
        skip: 0,
        limit: 12,
      });
      renderWithProviders(<Products />, { route: "/produtos?categoria=furniture" });
      expect(document.title).toBe("Móveis · Produtos · Shop Catalog");
      await screen.findByRole("article", { name: "Batom" });
    });

    it("ao trocar de página volta ao topo e foca o título", async () => {
      vi.spyOn(productsService, "listProducts").mockResolvedValue({
        products: many(12),
        total: 30,
        skip: 0,
        limit: 12,
      });
      renderWithProviders(<Products />);
      await screen.findByRole("article", { name: "Item 1" });
      expect(window.scrollTo).not.toHaveBeenCalled();

      await userEvent.click(screen.getByRole("button", { name: "2" }));
      await vi.waitFor(() =>
        expect(window.scrollTo).toHaveBeenCalledWith({ top: 0, behavior: "smooth" }),
      );
      expect(screen.getByRole("heading", { level: 1, name: "Produtos" })).toHaveFocus();
    });
  });

  describe("ordenação", () => {
    const one = { products: [make(1, "Batom")], total: 1, skip: 0, limit: 12 };

    it("repassa a ordenação escolhida à API e a mantém na URL", async () => {
      const list = vi.spyOn(productsService, "listProducts").mockResolvedValue(one);
      renderWithProviders(<Products />);
      await screen.findByRole("article", { name: "Batom" });

      await userEvent.click(screen.getByRole("combobox", { name: "Ordenar por" }));
      await userEvent.click(await screen.findByRole("option", { name: "Menor preço" }));

      await vi.waitFor(() =>
        expect(list).toHaveBeenLastCalledWith(expect.objectContaining({ sort: "preco-asc" })),
      );
      expect(screen.getByRole("combobox", { name: "Ordenar por" })).toHaveValue("Menor preço");
    });

    it("lê a ordenação da URL e ignora valores inválidos", async () => {
      const list = vi.spyOn(productsService, "listProducts").mockResolvedValue(one);
      renderWithProviders(<Products />, { route: "/produtos?ordem=avaliacao" });
      await screen.findByRole("article", { name: "Batom" });
      expect(list).toHaveBeenCalledWith(expect.objectContaining({ sort: "avaliacao" }));
    });

    it("valor inválido em ?ordem= vira 'relevância'", async () => {
      const list = vi.spyOn(productsService, "listProducts").mockResolvedValue(one);
      renderWithProviders(<Products />, { route: "/produtos?ordem=hack" });
      await screen.findByRole("article", { name: "Batom" });
      expect(list).toHaveBeenCalledWith(expect.objectContaining({ sort: null }));
    });
  });

  describe("filtros avançados", () => {
    const one = { products: [make(1, "Batom")], total: 1, skip: 0, limit: 12 };
    const empty = { products: [], total: 0, skip: 0, limit: 12 };

    it("o painel começa fechado e abre pelo botão Filtros (aria-expanded)", async () => {
      vi.spyOn(productsService, "listProducts").mockResolvedValue(one);
      renderWithProviders(<Products />);
      await screen.findByRole("article", { name: "Batom" });

      const toggle = screen.getByRole("button", { name: "Filtros" });
      expect(toggle).toHaveAttribute("aria-expanded", "false");
      expect(screen.queryByRole("region", { name: "Filtros avançados" })).not.toBeInTheDocument();

      await userEvent.click(toggle);
      expect(toggle).toHaveAttribute("aria-expanded", "true");
      expect(await screen.findByRole("region", { name: "Filtros avançados" })).toBeInTheDocument();
    });

    it("avaliação mínima e só em estoque chegam à API e atualizam o contador do botão", async () => {
      const list = vi.spyOn(productsService, "listProducts").mockResolvedValue(one);
      renderWithProviders(<Products />);
      await screen.findByRole("article", { name: "Batom" });
      await userEvent.click(screen.getByRole("button", { name: "Filtros" }));

      await userEvent.click(await screen.findByRole("combobox", { name: "Avaliação mínima" }));
      await userEvent.click(await screen.findByRole("option", { name: "4 estrelas ou mais" }));
      await vi.waitFor(() =>
        expect(list).toHaveBeenLastCalledWith(
          expect.objectContaining({ filters: { minRating: 4 } }),
        ),
      );
      expect(screen.getByRole("button", { name: "Filtros (1)" })).toBeInTheDocument();

      await userEvent.click(screen.getByRole("switch", { name: "Somente em estoque" }));
      await vi.waitFor(() =>
        expect(list).toHaveBeenLastCalledWith(
          expect.objectContaining({ filters: { minRating: 4, inStockOnly: true } }),
        ),
      );
      expect(screen.getByRole("button", { name: "Filtros (2)" })).toBeInTheDocument();
    });

    it("lê os filtros da URL, abre o painel e permite limpar tudo", async () => {
      const list = vi.spyOn(productsService, "listProducts").mockResolvedValue(one);
      renderWithProviders(<Products />, { route: "/produtos?nota=4.5&estoque=1" });
      await screen.findByRole("article", { name: "Batom" });

      expect(list).toHaveBeenCalledWith(
        expect.objectContaining({ filters: { minRating: 4.5, inStockOnly: true } }),
      );
      expect(screen.getByRole("button", { name: "Filtros (2)" })).toHaveAttribute(
        "aria-expanded",
        "true",
      );
      expect(screen.getByRole("switch", { name: "Somente em estoque" })).toBeChecked();

      await userEvent.click(screen.getByRole("button", { name: "Limpar filtros" }));
      await vi.waitFor(() =>
        expect(list).toHaveBeenLastCalledWith(expect.objectContaining({ filters: {} })),
      );
      expect(screen.getByRole("button", { name: "Filtros" })).toBeInTheDocument();
    });

    it("sem resultados com filtros ativos, oferece limpar", async () => {
      vi.spyOn(productsService, "listProducts").mockResolvedValue(empty);
      renderWithProviders(<Products />, { route: "/produtos?estoque=1" });
      expect(await screen.findByText("Nenhum produto encontrado")).toBeInTheDocument();
      expect(screen.getAllByRole("button", { name: "Limpar filtros" }).length).toBeGreaterThan(0);
    });

    it("valores inválidos na URL são ignorados", async () => {
      const list = vi.spyOn(productsService, "listProducts").mockResolvedValue(one);
      renderWithProviders(<Products />, { route: "/produtos?nota=abc&precoMin=-3&estoque=talvez" });
      await screen.findByRole("article", { name: "Batom" });
      expect(list).toHaveBeenCalledWith(expect.objectContaining({ filters: {} }));
      expect(screen.getByRole("button", { name: "Filtros" })).toHaveAttribute(
        "aria-expanded",
        "false",
      );
    });
  });
});

import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { FAVORITES_KEY } from "../contexts/favorites-provider";
import type { Product } from "../schemas/product-schema";
import * as productsService from "../services/products-service";
import { renderWithProviders } from "../test/render-with-providers";
import { Favorites } from "./favorites";

const make = (id: number): Product => ({
  id,
  title: `Produto ${id}`,
  description: "d",
  category: "beauty",
  price: 10,
  thumbnail: "t.png",
  images: [],
});

const catalog = (ids: number[]) =>
  vi.spyOn(productsService, "listProducts").mockResolvedValue({
    products: ids.map(make),
    total: ids.length,
    skip: 0,
    limit: 0,
  });

describe("Favorites", () => {
  afterEach(() => vi.restoreAllMocks());

  it("sem favoritos: estado vazio e nenhuma requisição ao catálogo", () => {
    const list = catalog([1, 2]);
    renderWithProviders(<Favorites />);
    expect(screen.getByText("Você ainda não tem favoritos")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Explorar produtos" })).toHaveAttribute(
      "href",
      "/produtos",
    );
    expect(list).not.toHaveBeenCalled();
    expect(document.title).toBe("Favoritos · Shop Catalog");
  });

  it("lista os favoritos, do mais recente para o mais antigo, ignorando ids desconhecidos", async () => {
    localStorage.setItem(FAVORITES_KEY, JSON.stringify([3, 999, 1]));
    catalog([1, 2, 3]);
    renderWithProviders(<Favorites />);

    const articles = await screen.findAllByRole("article");
    expect(articles.map((a) => a.getAttribute("aria-label"))).toEqual(["Produto 3", "Produto 1"]);
    expect(screen.getByText("3 produtos salvos para ver depois.")).toBeInTheDocument();
  });

  it("remover o favorito na própria lista atualiza a tela; sem nenhum, volta ao estado vazio", async () => {
    localStorage.setItem(FAVORITES_KEY, JSON.stringify([1]));
    catalog([1]);
    renderWithProviders(<Favorites />);

    await userEvent.click(
      await screen.findByRole("button", { name: "Remover Produto 1 dos favoritos" }),
    );
    expect(await screen.findByText("Você ainda não tem favoritos")).toBeInTheDocument();
    expect(JSON.parse(localStorage.getItem(FAVORITES_KEY)!)).toEqual([]);
  });

  it("todos os ids desconhecidos: mostra estado vazio em vez de lista em branco", async () => {
    localStorage.setItem(FAVORITES_KEY, JSON.stringify([500]));
    catalog([1]);
    renderWithProviders(<Favorites />);
    expect(await screen.findByText("Você ainda não tem favoritos")).toBeInTheDocument();
  });

  it("mostra erro amigável se o catálogo falhar", async () => {
    localStorage.setItem(FAVORITES_KEY, JSON.stringify([1]));
    vi.spyOn(productsService, "listProducts").mockRejectedValue(new Error("boom"));
    renderWithProviders(<Favorites />);
    expect(await screen.findByText(/erro inesperado/i)).toBeInTheDocument();
  });
});

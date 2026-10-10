import { screen, within } from "@testing-library/react";
import { RecentlyViewed } from "../components/recently-viewed";
import { TrustStrip } from "../components/trust-strip";
import { RECENT_KEY } from "../contexts/recently-viewed-provider";
import type { Product } from "../schemas/product-schema";
import * as productsService from "../services/products-service";
import { renderWithProviders } from "../test/render-with-providers";
import { Home } from "./home";

const make = (id: number, discountPercentage = 0): Product => ({
  id,
  title: `Produto ${id}`,
  description: "d",
  category: "beauty",
  price: 10,
  discountPercentage,
  thumbnail: "t.png",
  images: [],
});

function mockHomeApis(promos: Product[], all: Product[] = promos) {
  vi.spyOn(productsService, "listCategories").mockResolvedValue([]);
  vi.spyOn(productsService, "listTopDiscounts").mockResolvedValue(promos);
  return vi.spyOn(productsService, "listProducts").mockImplementation(async ({ limit } = {}) => ({
    products: limit === 0 ? all : all.slice(0, limit ?? 4),
    total: all.length,
    skip: 0,
    limit: limit ?? 4,
  }));
}

describe("TrustStrip", () => {
  it("mostra frete, devolução e pagamento, com o valor mínimo na moeda ativa", () => {
    renderWithProviders(<TrustStrip />);
    const items = screen.getAllByRole("listitem");
    expect(items).toHaveLength(3);
    expect(items[0]).toHaveTextContent("Frete grátis");
    // US$ 50 × cotação de teste 5 = R$ 250 (assim que a cotação chega)
    expect(items[1]).toHaveTextContent("Devolução em 30 dias");
    expect(items[2]).toHaveTextContent("Pagamento seguro");
  });

  it("converte o limite de frete grátis para reais", async () => {
    renderWithProviders(<TrustStrip />);
    expect(await screen.findByText(/acima de R\$\s250,00/)).toBeInTheDocument();
  });
});

describe("Home: em promoção", () => {
  afterEach(() => vi.restoreAllMocks());

  it("mostra a seção com os maiores descontos vindos da API", async () => {
    mockHomeApis([make(7, 40), make(8, 35)], [make(1), make(2)]);
    renderWithProviders(<Home />);

    const section = await screen.findByRole("region", { name: "Em promoção" });
    expect(await within(section).findByRole("article", { name: "Produto 7" })).toBeInTheDocument();
    expect(within(section).getByRole("article", { name: "Produto 8" })).toBeInTheDocument();
    expect(within(section).getByLabelText("40% de desconto")).toBeInTheDocument();
    expect(productsService.listTopDiscounts).toHaveBeenCalledWith(4, expect.anything());
  });

  it("falha ao carregar promoções mostra erro sem derrubar o resto da Home", async () => {
    mockHomeApis([], [make(1)]);
    vi.spyOn(productsService, "listTopDiscounts").mockRejectedValue(new Error("boom"));
    renderWithProviders(<Home />);
    expect(await screen.findByText(/erro inesperado/i)).toBeInTheDocument();
    expect(await screen.findByRole("heading", { name: "Destaques" })).toBeInTheDocument();
  });
});

describe("RecentlyViewed", () => {
  afterEach(() => vi.restoreAllMocks());
  const catalog = Array.from({ length: 12 }, (_, i) => make(i + 1));

  const seed = (ids: unknown) => localStorage.setItem(RECENT_KEY, JSON.stringify(ids));

  it("sem histórico não renderiza nada nem consulta a API", () => {
    const spy = mockHomeApis([], catalog);
    const { container } = renderWithProviders(<RecentlyViewed />);
    expect(container.querySelector("section")).toBeNull();
    expect(spy).not.toHaveBeenCalled();
  });

  it("mostra do mais recente ao mais antigo, até o máximo pedido", async () => {
    mockHomeApis([], catalog);
    seed([5, 3, 9, 1, 7]);
    renderWithProviders(<RecentlyViewed max={4} />);
    const section = await screen.findByRole("region", { name: "Vistos recentemente" });
    const names = (await within(section).findAllByRole("article")).map((a) =>
      a.getAttribute("aria-label"),
    );
    expect(names).toEqual(["Produto 5", "Produto 3", "Produto 9", "Produto 1"]);
  });

  it("não recomenda o produto da página atual", async () => {
    mockHomeApis([], catalog);
    seed([5, 3]);
    renderWithProviders(<RecentlyViewed excludeId={5} />);
    const articles = await screen.findAllByRole("article");
    expect(articles.map((a) => a.getAttribute("aria-label"))).toEqual(["Produto 3"]);
  });

  it("ignora ids que a API não conhece: sem produtos válidos, não mostra a seção", async () => {
    const spy = mockHomeApis([], catalog);
    seed([999]);
    const { container } = renderWithProviders(<RecentlyViewed />);
    await vi.waitFor(() => expect(spy).toHaveBeenCalled()); // a consulta terminou
    await Promise.resolve();
    expect(container.querySelector("section")).toBeNull();
  });
});

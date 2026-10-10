import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Route, Routes } from "react-router";
import { averageRating } from "../helpers/reviews";
import { pickRelated } from "../helpers/related";
import i18n from "../i18n";
import type { Product, Review } from "../schemas/product-schema";
import * as productsService from "../services/products-service";
import { renderWithProviders } from "../test/render-with-providers";
import { ProductDetails } from "../pages/product-details";
import { ProductReviews } from "./product-reviews";

const review = (rating: number, name: string, date = "2025-05-23T08:56:21.618Z"): Review => ({
  rating,
  reviewerName: name,
  comment: `Comentário de ${name}`,
  date,
});

const make = (id: number, overrides: Partial<Product> = {}): Product => ({
  id,
  title: `Produto ${id}`,
  description: "d",
  category: "beauty",
  price: 10,
  brand: "Acme",
  stock: 9,
  thumbnail: "t.png",
  images: [],
  ...overrides,
});

describe("averageRating", () => {
  it("média com uma casa; null sem avaliações", () => {
    expect(averageRating([review(5, "a"), review(4, "b"), review(4, "c")])).toBe(4.3);
    expect(averageRating([review(3, "a")])).toBe(3);
    expect(averageRating([])).toBeNull();
  });
});

describe("pickRelated", () => {
  const current = make(1, { brand: "Acme" });

  it("exclui o próprio produto e limita a quantidade", () => {
    const list = [make(1), ...Array.from({ length: 8 }, (_, i) => make(i + 2))];
    const related = pickRelated(list, current);
    expect(related).toHaveLength(4);
    expect(related.map((p) => p.id)).not.toContain(1);
  });

  it("marca igual vem primeiro, preservando a ordem entre iguais", () => {
    const list = [
      make(2, { brand: "Zeta" }),
      make(3, { brand: "Acme" }),
      make(4, { brand: "Zeta" }),
      make(5, { brand: "Acme" }),
    ];
    expect(pickRelated(list, current).map((p) => p.id)).toEqual([3, 5, 2, 4]);
  });

  it("produto sem marca não dá prioridade a ninguém por engano", () => {
    const noBrand = make(1, { brand: undefined });
    const list = [make(2, { brand: undefined }), make(3, { brand: "Acme" })];
    expect(pickRelated(list, noBrand).map((p) => p.id)).toEqual([2, 3]);
  });

  it("lista vazia ou só com o próprio produto resulta em vazio", () => {
    expect(pickRelated([], current)).toEqual([]);
    expect(pickRelated([make(1)], current)).toEqual([]);
  });
});

describe("ProductReviews", () => {
  it("mostra título com a contagem, média e as 3 primeiras avaliações", () => {
    const reviews = [review(5, "Ana"), review(4, "Bruno"), review(3, "Carla"), review(1, "Diego")];
    renderWithProviders(<ProductReviews reviews={reviews} />);

    expect(screen.getByRole("heading", { name: "Avaliações (4)", level: 2 })).toBeInTheDocument();
    expect(screen.getByText("Média das 4 avaliações de clientes: 3.3")).toBeInTheDocument();
    expect(screen.getAllByRole("listitem")).toHaveLength(3);
    expect(screen.getByText("Comentário de Ana")).toBeInTheDocument();
    expect(screen.queryByText("Comentário de Diego")).not.toBeInTheDocument();
    // a nota é lida em texto (as estrelas são decorativas)
    expect(screen.getAllByText("5 de 5 estrelas").length).toBe(1);
  });

  it("'Ver todas' expande e 'Mostrar menos' recolhe (aria-expanded)", async () => {
    const reviews = Array.from({ length: 5 }, (_, i) => review(4, `Pessoa ${i}`));
    renderWithProviders(<ProductReviews reviews={reviews} />);

    const toggle = screen.getByRole("button", { name: "Ver todas as 5 avaliações" });
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    await userEvent.click(toggle);
    expect(screen.getAllByRole("listitem")).toHaveLength(5);
    expect(screen.getByRole("button", { name: "Mostrar menos" })).toHaveAttribute(
      "aria-expanded",
      "true",
    );
    await userEvent.click(screen.getByRole("button", { name: "Mostrar menos" }));
    expect(screen.getAllByRole("listitem")).toHaveLength(3);
  });

  it("com até 3 avaliações não mostra o botão", () => {
    renderWithProviders(<ProductReviews reviews={[review(5, "Ana")]} />);
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("sem avaliações mostra a mensagem e nenhuma média", () => {
    renderWithProviders(<ProductReviews reviews={[]} />);
    expect(screen.getByText("Este produto ainda não tem avaliações.")).toBeInTheDocument();
    expect(screen.queryByText(/Média das/)).not.toBeInTheDocument();
  });

  it("formata a data em português e tolera data inválida (fica em branco)", () => {
    renderWithProviders(
      <ProductReviews
        reviews={[review(5, "Ana", "2025-05-23T12:00:00.000Z"), review(5, "Bia", "ontem")]}
      />,
    );
    expect(screen.getByText(/23 de mai. de 2025/)).toBeInTheDocument();
    expect(screen.getByText("Comentário de Bia")).toBeInTheDocument(); // não quebra
  });

  it("formata a data em inglês quando o idioma é en", async () => {
    await i18n.changeLanguage("en");
    renderWithProviders(
      <ProductReviews reviews={[review(5, "Ana", "2025-05-23T12:00:00.000Z")]} />,
    );
    expect(screen.getByText(/May 23, 2025/)).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Reviews (1)" })).toBeInTheDocument();
  });
});

describe("ProductDetails: avaliações e relacionados", () => {
  afterEach(() => vi.restoreAllMocks());

  const renderDetails = (product: Product, related: Product[]) => {
    vi.spyOn(productsService, "getProduct").mockResolvedValue(product);
    vi.spyOn(productsService, "listProducts").mockResolvedValue({
      products: related,
      total: related.length,
      skip: 0,
      limit: 0,
    });
    return renderWithProviders(
      <Routes>
        <Route path="/produtos/:id" element={<ProductDetails />} />
      </Routes>,
      { route: `/produtos/${product.id}` },
    );
  };

  it("mostra avaliações e produtos relacionados (sem o próprio produto)", async () => {
    const product = make(1, { reviews: [review(5, "Ana"), review(4, "Bruno")] });
    renderDetails(product, [product, make(2), make(3)]);

    expect(await screen.findByRole("heading", { name: "Avaliações (2)" })).toBeInTheDocument();
    const related = await screen.findByRole("region", { name: "Produtos relacionados" });
    const names = within(related)
      .getAllByRole("article")
      .map((a) => a.getAttribute("aria-label"));
    expect(names).toEqual(["Produto 2", "Produto 3"]);
    expect(productsService.listProducts).toHaveBeenCalledWith(
      expect.objectContaining({ category: "beauty", limit: 0 }),
    );
  });

  it("produto sem avaliações e sem relacionados: avisa, sem seção vazia de relacionados", async () => {
    const product = make(1);
    renderDetails(product, [product]);
    expect(await screen.findByText("Este produto ainda não tem avaliações.")).toBeInTheDocument();
    expect(screen.queryByRole("region", { name: "Produtos relacionados" })).not.toBeInTheDocument();
  });
});

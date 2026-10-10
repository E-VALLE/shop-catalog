import { screen } from "@testing-library/react";
import { Route, Routes } from "react-router";
import type { Product } from "../schemas/product-schema";
import * as productsService from "../services/products-service";
import { renderWithProviders } from "../test/render-with-providers";
import { ProductDetails } from "./product-details";

const product: Product = {
  id: 14,
  title: "Knoll Chair",
  description: "Uma cadeira",
  category: "furniture",
  price: 100,
  brand: "Knoll",
  stock: 5,
  thumbnail: "t.png",
  images: [],
};

function renderDetails(p: Product) {
  vi.spyOn(productsService, "getProduct").mockResolvedValue(p);
  vi.spyOn(productsService, "listProducts").mockResolvedValue({
    products: [],
    total: 0,
    skip: 0,
    limit: 0,
  });
  return renderWithProviders(
    <Routes>
      <Route path="/produtos/:id" element={<ProductDetails />} />
    </Routes>,
    { route: "/produtos/14" },
  );
}

describe("ProductDetails: atalhos de categoria e marca", () => {
  afterEach(() => vi.restoreAllMocks());

  it("categoria leva ao catálogo filtrado", async () => {
    renderDetails(product);
    const link = await screen.findByRole("link", { name: "Ver mais produtos da categoria Móveis" });
    expect(link).toHaveAttribute("href", "/produtos?categoria=furniture");
    expect(link).toHaveTextContent("Móveis");
  });

  it("marca leva ao catálogo filtrado por categoria e marca", async () => {
    renderDetails(product);
    const link = await screen.findByRole("link", { name: "Ver produtos da marca Knoll em Móveis" });
    expect(link).toHaveAttribute("href", "/produtos?categoria=furniture&marca=Knoll");
  });

  it("sem marca, não mostra o atalho de marca", async () => {
    renderDetails({ ...product, brand: undefined });
    await screen.findByRole("link", { name: /Ver mais produtos da categoria/ });
    expect(screen.queryByRole("link", { name: /Ver produtos da marca/ })).not.toBeInTheDocument();
  });

  it("mostra o breadcrumb Produtos › Categoria › produto", async () => {
    renderDetails(product);
    const nav = await screen.findByRole("navigation", { name: "Navegação estrutural" });
    expect(nav).toHaveTextContent("Produtos");
    expect(nav).toHaveTextContent("Móveis");
    expect(nav).toHaveTextContent("Knoll Chair");
  });

  it("mostra skeleton enquanto carrega e usa o nome do produto como título da aba", async () => {
    let resolve!: (value: Product) => void;
    vi.spyOn(productsService, "getProduct").mockReturnValue(new Promise((r) => (resolve = r)));
    vi.spyOn(productsService, "listProducts").mockResolvedValue({
      products: [],
      total: 0,
      skip: 0,
      limit: 0,
    });
    renderWithProviders(
      <Routes>
        <Route path="/produtos/:id" element={<ProductDetails />} />
      </Routes>,
      { route: "/produtos/14" },
    );
    expect(screen.getByRole("status", { name: "Carregando produto..." })).toHaveAttribute(
      "aria-busy",
      "true",
    );
    expect(document.title).toBe("Shop Catalog");

    resolve(product);
    expect(
      await screen.findByRole("heading", { level: 1, name: "Knoll Chair" }),
    ).toBeInTheDocument();
    expect(document.title).toBe("Knoll Chair · Shop Catalog");
  });

  describe("estoque e desconto", () => {
    it("poucas unidades: texto de alerta e compra liberada", async () => {
      renderDetails({ ...product, stock: 2 });
      expect(await screen.findByText("Restam apenas 2 unidades")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Adicionar ao carrinho" })).toBeEnabled();
    });

    it("esgotado: mostra o aviso e bloqueia a compra", async () => {
      renderDetails({ ...product, stock: 0 });
      expect(await screen.findByText("Esgotado")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Adicionar ao carrinho" })).toBeDisabled();
    });

    it("mostra o selo de desconto ao lado do preço", async () => {
      renderDetails({ ...product, discountPercentage: 12 });
      expect(await screen.findByLabelText("12% de desconto")).toHaveTextContent("-12%");
    });
  });
});

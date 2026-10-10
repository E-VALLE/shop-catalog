import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ProductListItem } from "../components/product-list-item";
import { VIEW_KEY, parseView } from "../helpers/view";
import type { Product } from "../schemas/product-schema";
import * as productsService from "../services/products-service";
import { renderWithProviders } from "../test/render-with-providers";
import { Products } from "./products";

const make = (id: number, overrides: Partial<Product> = {}): Product => ({
  id,
  title: `Produto ${id}`,
  description: `Descrição longa do produto ${id}`,
  category: "beauty",
  price: 100,
  discountPercentage: 20,
  rating: 4.6,
  stock: 40,
  brand: "Acme",
  thumbnail: "t.png",
  images: [],
  ...overrides,
});

const respond = () =>
  vi.spyOn(productsService, "listProducts").mockResolvedValue({
    products: [make(1), make(2)],
    total: 2,
    skip: 0,
    limit: 12,
  });

describe("parseView", () => {
  it("aceita só grade/lista", () => {
    expect(parseView("grade")).toBe("grade");
    expect(parseView("lista")).toBe("lista");
    for (const v of ["", "list", "LISTA", null, undefined, "grid"]) expect(parseView(v)).toBeNull();
  });
});

describe("ProductListItem", () => {
  it("mostra descrição, marca, nota, preço com desconto e ações", () => {
    renderWithProviders(<ProductListItem product={make(7)} />);
    const item = screen.getByRole("article", { name: "Produto 7" });
    expect(within(item).getByText("Descrição longa do produto 7")).toBeInTheDocument();
    expect(within(item).getByText("Acme")).toBeInTheDocument();
    expect(within(item).getByText("4.6")).toBeInTheDocument();
    // US$ 100 − 20% (a cotação ainda não chegou, então vem em dólar)
    expect(within(item).getByText(/US\$\s80,00/)).toBeInTheDocument();
    expect(within(item).getByLabelText("20% de desconto")).toBeInTheDocument();
    expect(within(item).getByRole("link", { name: "Detalhes" })).toHaveAttribute(
      "href",
      "/produtos/7",
    );
    expect(
      within(item).getByRole("button", { name: "Adicionar Produto 7 ao carrinho" }),
    ).toBeInTheDocument();
    expect(
      within(item).getByRole("button", { name: "Adicionar Produto 7 aos favoritos" }),
    ).toBeInTheDocument();
    expect(within(item).getByRole("button", { name: "Comparar Produto 7" })).toBeInTheDocument();
  });

  it("o título e a imagem levam aos detalhes, sem duplicar o foco da imagem", () => {
    const { container } = renderWithProviders(<ProductListItem product={make(7)} />);
    expect(screen.getByRole("link", { name: "Produto 7" })).toHaveAttribute("href", "/produtos/7");
    const imageLink = container.querySelector("a[aria-hidden='true']");
    expect(imageLink).toHaveAttribute("href", "/produtos/7");
    expect(imageLink).toHaveAttribute("tabindex", "-1");
  });

  it("avisa estoque baixo e esgotado, e bloqueia a compra quando esgotado", () => {
    const { unmount } = renderWithProviders(<ProductListItem product={make(1, { stock: 2 })} />);
    expect(screen.getByText("Restam apenas 2 unidades")).toBeInTheDocument();
    unmount();
    renderWithProviders(<ProductListItem product={make(1, { stock: 0 })} />);
    expect(screen.getByText("Esgotado")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Adicionar Produto 1 ao carrinho" })).toBeDisabled();
  });

  it("sem desconto, não mostra preço riscado nem selo", () => {
    renderWithProviders(<ProductListItem product={make(1, { discountPercentage: 0 })} />);
    expect(screen.queryByLabelText(/de desconto/)).not.toBeInTheDocument();
  });
});

describe("Products: grade × lista", () => {
  afterEach(() => vi.restoreAllMocks());

  it("começa em grade; o seletor tem nomes acessíveis e marca a opção ativa", async () => {
    respond();
    renderWithProviders(<Products />);
    await screen.findByRole("article", { name: "Produto 1" });
    expect(screen.queryByText("Descrição longa do produto 1")).not.toBeInTheDocument(); // cartões não mostram descrição
    expect(screen.getByRole("radio", { name: "Grade" })).toBeChecked();
    expect(screen.getByRole("radio", { name: "Lista" })).not.toBeChecked();
  });

  it("trocar para lista mostra a visão detalhada e guarda a preferência", async () => {
    respond();
    renderWithProviders(<Products />);
    await screen.findByRole("article", { name: "Produto 1" });
    await userEvent.click(screen.getByRole("radio", { name: "Lista" }));

    expect(await screen.findByText("Descrição longa do produto 1")).toBeInTheDocument();
    expect(screen.getAllByRole("article")).toHaveLength(2);
    expect(localStorage.getItem(VIEW_KEY)).toBe("lista");
  });

  it("lê ?vista=lista da URL", async () => {
    respond();
    renderWithProviders(<Products />, { route: "/produtos?vista=lista" });
    expect(await screen.findByText("Descrição longa do produto 2")).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "Lista" })).toBeChecked();
  });

  it("sem ?vista usa a última preferência salva; a URL tem prioridade sobre ela", async () => {
    localStorage.setItem(VIEW_KEY, "lista");
    respond();
    const first = renderWithProviders(<Products />);
    expect(await screen.findByText("Descrição longa do produto 1")).toBeInTheDocument();
    first.unmount();

    renderWithProviders(<Products />, { route: "/produtos?vista=grade" });
    await screen.findByRole("article", { name: "Produto 1" });
    expect(screen.queryByText("Descrição longa do produto 1")).not.toBeInTheDocument();
  });

  it("valores inválidos (URL ou armazenamento) caem em grade", async () => {
    localStorage.setItem(VIEW_KEY, "mosaico");
    respond();
    renderWithProviders(<Products />, { route: "/produtos?vista=hack" });
    await screen.findByRole("article", { name: "Produto 1" });
    expect(screen.getByRole("radio", { name: "Grade" })).toBeChecked();
  });
});

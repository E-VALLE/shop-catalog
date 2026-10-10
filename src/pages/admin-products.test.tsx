import { notifications } from "@mantine/notifications";
import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useEffect } from "react";
import { useAdminStore } from "../hooks/use-admin-store";
import type { Product } from "../schemas/product-schema";
import * as productsService from "../services/products-service";
import { renderWithProviders } from "../test/render-with-providers";
import { AdminProducts } from "./admin-products";

const make = (id: number, title: string, category = "beauty", price = 10, stock = 5): Product => ({
  id,
  title,
  description: "d",
  category,
  price,
  stock,
  thumbnail: "t.png",
  images: [],
});

const respond = (products: Product[]) =>
  vi.spyOn(productsService, "listProducts").mockResolvedValue({
    products,
    total: products.length,
    skip: 0,
    limit: 12,
  });

/** Cria um produto "local" (como o formulário de novo produto faria) assim que monta. */
function SeedLocalProduct({ product }: { product: Product }) {
  const { addCreated } = useAdminStore();
  useEffect(() => addCreated(product), [addCreated, product]);
  return null;
}

describe("AdminProducts", () => {
  beforeEach(() => {
    vi.spyOn(productsService, "listCategories").mockResolvedValue([
      { slug: "beauty", name: "Beauty", url: "" },
    ]);
  });
  afterEach(() => vi.restoreAllMocks());

  it("lista os produtos em tabela, com categoria traduzida, preço e ações", async () => {
    respond([make(1, "Batom", "beauty", 12.5, 3), make(2, "Sofá", "furniture", 300, 40)]);
    renderWithProviders(<AdminProducts />);

    const table = await screen.findByRole("table");
    const rows = within(table).getAllByRole("row").slice(1); // sem o cabeçalho
    expect(rows).toHaveLength(2);
    expect(within(rows[0]).getByText("Batom")).toBeInTheDocument();
    expect(within(rows[0]).getByText("Beleza")).toBeInTheDocument();
    expect(within(rows[1]).getByText("Móveis")).toBeInTheDocument();
    expect(within(rows[0]).getByRole("link", { name: "Editar Batom" })).toHaveAttribute(
      "href",
      "/admin/produtos/1/editar",
    );
    expect(within(rows[0]).getByRole("link", { name: "Batom" })).toHaveAttribute(
      "href",
      "/produtos/1",
    );
    expect(screen.getByRole("link", { name: "Novo produto" })).toHaveAttribute(
      "href",
      "/admin/produtos/novo",
    );
  });

  it("sem produtos mostra o estado vazio", async () => {
    respond([]);
    renderWithProviders(<AdminProducts />);
    expect(await screen.findByText("Nenhum produto encontrado")).toBeInTheDocument();
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
  });

  it("falha da API mostra erro amigável", async () => {
    vi.spyOn(productsService, "listProducts").mockRejectedValue(new Error("boom"));
    renderWithProviders(<AdminProducts />);
    expect(await screen.findByText(/erro inesperado/i)).toBeInTheDocument();
  });

  describe("exclusão", () => {
    it("pede confirmação, chama a API, remove a linha e avisa", async () => {
      respond([make(1, "Batom"), make(2, "Perfume")]);
      const remove = vi.spyOn(productsService, "deleteProduct").mockResolvedValue();
      renderWithProviders(<AdminProducts />);

      await userEvent.click(await screen.findByRole("button", { name: "Excluir Batom" }));
      expect(await screen.findByText(/Deseja excluir “Batom”\?/)).toBeInTheDocument();
      expect(remove).not.toHaveBeenCalled(); // ainda não confirmou

      await userEvent.click(screen.getByRole("button", { name: "Excluir" }));
      await vi.waitFor(() => expect(remove).toHaveBeenCalledWith(1));
      await vi.waitFor(() =>
        expect(screen.queryByRole("link", { name: "Batom" })).not.toBeInTheDocument(),
      );
      expect(screen.getByRole("link", { name: "Perfume" })).toBeInTheDocument();
      expect(await screen.findByText("1 produto excluído")).toBeInTheDocument(); // com botão Desfazer
    });

    it("cancelar mantém o produto e não chama a API", async () => {
      respond([make(1, "Batom")]);
      const remove = vi.spyOn(productsService, "deleteProduct").mockResolvedValue();
      renderWithProviders(<AdminProducts />);

      await userEvent.click(await screen.findByRole("button", { name: "Excluir Batom" }));
      await userEvent.click(await screen.findByRole("button", { name: "Cancelar" }));
      expect(remove).not.toHaveBeenCalled();
      expect(screen.getByRole("link", { name: "Batom" })).toBeInTheDocument();
    });

    it("se a API falhar, o produto permanece e o erro é mostrado", async () => {
      const show = vi.spyOn(notifications, "show");
      respond([make(1, "Batom")]);
      vi.spyOn(productsService, "deleteProduct").mockRejectedValue(new Error("boom"));
      renderWithProviders(<AdminProducts />);

      await userEvent.click(await screen.findByRole("button", { name: "Excluir Batom" }));
      await userEvent.click(await screen.findByRole("button", { name: "Excluir" }));
      await vi.waitFor(() =>
        expect(show).toHaveBeenCalledWith(expect.objectContaining({ color: "red" })),
      );
      expect(screen.getByRole("link", { name: "Batom" })).toBeInTheDocument();
    });
  });

  describe("produtos criados localmente no admin", () => {
    const local = make(10_001, "Produto novo", "furniture");

    it("aparecem no topo da primeira página sem filtros", async () => {
      respond([make(1, "Batom")]);
      renderWithProviders(
        <>
          <SeedLocalProduct product={local} />
          <AdminProducts />
        </>,
      );
      await screen.findByRole("link", { name: "Batom" });
      const names = within(screen.getByRole("table"))
        .getAllByRole("row")
        .slice(1)
        .map((row) => within(row).getAllByRole("link")[0].textContent);
      expect(names[0]).toBe("Produto novo");
      expect(names).toContain("Batom");
    });

    it("não aparecem em páginas seguintes nem com filtro ativo", async () => {
      respond([make(1, "Batom")]);
      renderWithProviders(
        <>
          <SeedLocalProduct product={local} />
          <AdminProducts />
        </>,
        { route: "/admin/produtos?categoria=beauty" },
      );
      await screen.findByRole("link", { name: "Batom" });
      expect(screen.queryByRole("link", { name: "Produto novo" })).not.toBeInTheDocument();
    });

    it("excluir um produto local não chama a API (ele só existe na sessão)", async () => {
      respond([make(1, "Batom")]);
      const remove = vi.spyOn(productsService, "deleteProduct").mockResolvedValue();
      renderWithProviders(
        <>
          <SeedLocalProduct product={local} />
          <AdminProducts />
        </>,
      );
      await userEvent.click(await screen.findByRole("button", { name: "Excluir Produto novo" }));
      await userEvent.click(await screen.findByRole("button", { name: "Excluir" }));
      await vi.waitFor(() =>
        expect(screen.queryByRole("link", { name: "Produto novo" })).not.toBeInTheDocument(),
      );
      expect(remove).not.toHaveBeenCalled();
    });
  });
});

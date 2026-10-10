import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Route, Routes } from "react-router";
import { LOCAL_ID_START } from "../helpers/ids";
import type { Product } from "../schemas/product-schema";
import * as productsService from "../services/products-service";
import { renderWithProviders } from "../test/render-with-providers";
import { ProductFormPage } from "./product-form-page";

const remote: Product = {
  id: 5,
  title: "Produto remoto",
  description: "descrição do produto remoto",
  category: "beauty",
  price: 20,
  stock: 4,
  thumbnail: "t.png",
  images: [],
};

const renderPage = (route: string) =>
  renderWithProviders(
    <Routes>
      <Route path="/admin/produtos/novo" element={<ProductFormPage />} />
      <Route path="/admin/produtos/:id/editar" element={<ProductFormPage />} />
      <Route path="/admin/produtos" element={<p>lista de produtos</p>} />
    </Routes>,
    { route },
  );

beforeEach(() => {
  vi.spyOn(productsService, "listCategories").mockResolvedValue([
    { slug: "beauty", name: "Beauty", url: "u" },
    { slug: "furniture", name: "Furniture", url: "u" },
  ]);
});
afterEach(() => vi.restoreAllMocks());

describe("ProductFormPage", () => {
  it("novo: valida, cria (simulado) e volta para a lista", async () => {
    const create = vi
      .spyOn(productsService, "createProduct")
      .mockResolvedValue({ ...remote, id: LOCAL_ID_START });
    const user = userEvent.setup();
    renderPage("/admin/produtos/novo");

    await user.click(await screen.findByRole("button", { name: "Criar produto" }));
    expect(create).not.toHaveBeenCalled(); // campos vazios: o formulário recusa

    await user.type(screen.getByLabelText(/Título/), "Produto novo");
    await user.type(screen.getByLabelText(/Descrição/), "uma descrição longa o bastante");
    await user.click(screen.getByRole("combobox", { name: /Categoria/ }));
    await user.click(await screen.findByRole("option", { name: "Beleza" }));
    await user.type(screen.getByLabelText(/Preço/), "12");
    await user.type(screen.getByLabelText(/Estoque/), "3");
    await user.click(screen.getByRole("button", { name: "Criar produto" }));

    await waitFor(() => expect(create).toHaveBeenCalledTimes(1));
    expect(create.mock.calls[0][0]).toMatchObject({ title: "Produto novo", category: "beauty" });
    expect(await screen.findByText("lista de produtos")).toBeVisible();
  });

  it("editar: carrega o produto da API, salva e volta para a lista", async () => {
    vi.spyOn(productsService, "getProduct").mockResolvedValue(remote);
    const update = vi.spyOn(productsService, "updateProduct").mockResolvedValue(remote);
    const user = userEvent.setup();
    renderPage("/admin/produtos/5/editar");

    const title = await screen.findByLabelText(/Título/);
    expect(title).toHaveValue("Produto remoto");
    await user.clear(title);
    await user.type(title, "Produto editado");
    await user.click(screen.getByRole("button", { name: "Salvar alterações" }));

    await waitFor(() => expect(update).toHaveBeenCalledWith(5, expect.anything()));
    expect(update.mock.calls[0][1]).toMatchObject({ title: "Produto editado" });
    expect(await screen.findByText("lista de produtos")).toBeVisible();
  });

  it("id inválido mostra o erro em vez do formulário", async () => {
    renderPage("/admin/produtos/abc/editar");
    expect(await screen.findByRole("alert")).toBeVisible();
    expect(screen.queryByLabelText(/Título/)).not.toBeInTheDocument();
  });

  it("falha ao salvar mantém a página e não navega", async () => {
    vi.spyOn(productsService, "getProduct").mockResolvedValue(remote);
    vi.spyOn(productsService, "updateProduct").mockRejectedValue(new Error("falhou"));
    const user = userEvent.setup();
    renderPage("/admin/produtos/5/editar");

    await user.click(await screen.findByRole("button", { name: "Salvar alterações" }));
    await waitFor(() => expect(screen.getByLabelText(/Título/)).toBeVisible());
    expect(screen.queryByText("lista de produtos")).not.toBeInTheDocument();
  });
});

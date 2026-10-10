import type { Product } from "../schemas/product-schema";
import { api } from "./api";
import { fetchRole, login } from "./auth-service";
import {
  InvalidResponseError,
  createProduct,
  deleteProduct,
  getProduct,
  listCategories,
  listTopDiscounts,
  updateProduct,
} from "./products-service";

const product: Product = {
  id: 7,
  title: "Produto 7",
  description: "d",
  category: "beauty",
  price: 10,
  thumbnail: "t.png",
  images: [],
};

afterEach(() => vi.restoreAllMocks());

describe("products-service: leituras", () => {
  it("getProduct valida e devolve o produto", async () => {
    const get = vi.spyOn(api, "get").mockResolvedValue({ data: product });
    await expect(getProduct(7)).resolves.toEqual(product);
    expect(get).toHaveBeenCalledWith("/products/7", { signal: undefined });
  });

  it("getProduct rejeita resposta fora do contrato", async () => {
    vi.spyOn(api, "get").mockResolvedValue({ data: { id: "x" } });
    await expect(getProduct(7)).rejects.toBeInstanceOf(InvalidResponseError);
  });

  it("listTopDiscounts pede a ordenação por desconto à API", async () => {
    const get = vi.spyOn(api, "get").mockResolvedValue({
      data: { products: [product], total: 1, skip: 0, limit: 4 },
    });
    await expect(listTopDiscounts(4)).resolves.toEqual([product]);
    expect(get).toHaveBeenCalledWith(
      "/products",
      expect.objectContaining({
        params: { sortBy: "discountPercentage", order: "desc", limit: 4 },
      }),
    );
  });

  it("listTopDiscounts rejeita resposta inválida", async () => {
    vi.spyOn(api, "get").mockResolvedValue({ data: {} });
    await expect(listTopDiscounts()).rejects.toThrow(/promoções/);
  });

  it("listCategories valida a lista e rejeita formato inesperado", async () => {
    const categories = [{ slug: "beauty", name: "Beauty", url: "u" }];
    vi.spyOn(api, "get").mockResolvedValueOnce({ data: categories });
    await expect(listCategories()).resolves.toEqual(categories);

    vi.spyOn(api, "get").mockResolvedValueOnce({ data: ["beauty"] });
    await expect(listCategories()).rejects.toThrow(/categorias/);
  });
});

describe("products-service: escrita simulada", () => {
  const values = {
    title: "Novo",
    description: "descrição",
    category: "beauty",
    price: 5,
    stock: 2,
  };

  it("createProduct usa o id devolvido (ou 0) e começa sem imagem", async () => {
    vi.spyOn(api, "post").mockResolvedValueOnce({ data: { id: 195 } });
    await expect(createProduct(values)).resolves.toMatchObject({
      id: 195,
      thumbnail: "",
      images: [],
      title: "Novo",
    });

    vi.spyOn(api, "post").mockResolvedValueOnce({ data: {} });
    expect((await createProduct(values)).id).toBe(0);
  });

  it("updateProduct e deleteProduct chamam a rota do produto", async () => {
    const put = vi.spyOn(api, "put").mockResolvedValue({ data: {} });
    const del = vi.spyOn(api, "delete").mockResolvedValue({ data: {} });
    await expect(updateProduct(3, values)).resolves.toMatchObject({ id: 3, price: 5 });
    await deleteProduct(3);
    expect(put).toHaveBeenCalledWith("/products/3", values);
    expect(del).toHaveBeenCalledWith("/products/3");
  });
});

describe("auth-service: fetchRole", () => {
  it.each(["admin", "moderator", "user"])("devolve o papel %s de /auth/me", async (role) => {
    const get = vi.spyOn(api, "get").mockResolvedValue({ data: { id: 1, role } });
    await expect(fetchRole()).resolves.toBe(role);
    expect(get).toHaveBeenCalledWith("/auth/me");
  });

  it.each([{}, { role: "root" }, { role: null }, "texto", null])(
    "resposta inesperada (%j) vira user",
    async (data) => {
      vi.spyOn(api, "get").mockResolvedValue({ data });
      await expect(fetchRole()).resolves.toBe("user");
    },
  );

  it("falha de rede ou 401 nunca promove a admin: vira user sem lançar", async () => {
    vi.spyOn(api, "get").mockRejectedValue(new Error("rede"));
    await expect(fetchRole()).resolves.toBe("user");
  });
});

describe("auth-service", () => {
  const credentials = { username: "emilys", password: "emilyspass" };

  it("envia as credenciais com validade de 60 min e valida a resposta", async () => {
    const data = {
      id: 1,
      username: "emilys",
      firstName: "Emily",
      lastName: "Johnson",
      accessToken: "jwt",
    };
    const post = vi.spyOn(api, "post").mockResolvedValue({ data });
    await expect(login(credentials)).resolves.toEqual(data);
    expect(post).toHaveBeenCalledWith("/auth/login", { ...credentials, expiresInMins: 60 });
  });

  it("rejeita resposta sem token", async () => {
    vi.spyOn(api, "post").mockResolvedValue({ data: { id: 1 } });
    await expect(login(credentials)).rejects.toBeInstanceOf(InvalidResponseError);
  });
});

import type { Product } from "../schemas/product-schema";
import { api } from "./api";
import { PAGE_SIZE, listProducts } from "./products-service";

const make = (id: number, category: string, brand?: string): Product => ({
  id,
  title: `Produto ${id}`,
  description: "d",
  category,
  price: 10,
  brand,
  thumbnail: "t.png",
  images: [],
});

const respond = (products: Product[]) =>
  vi.spyOn(api, "get").mockResolvedValue({
    data: { products, total: products.length, skip: 0, limit: products.length },
  });

describe("listProducts", () => {
  afterEach(() => vi.restoreAllMocks());

  it("sem marca, pagina no servidor (limit/skip)", async () => {
    const get = respond([make(1, "beauty")]);
    await listProducts({ page: 3 });
    expect(get).toHaveBeenCalledWith(
      "/products",
      expect.objectContaining({
        params: expect.objectContaining({ limit: PAGE_SIZE, skip: PAGE_SIZE * 2 }),
      }),
    );
  });

  it("filtra por marca de forma exata, sem diferenciar maiúsculas e ignorando quem não tem marca", async () => {
    const get = respond([
      make(1, "furniture", "Knoll"),
      make(2, "furniture", "knoll"),
      make(3, "furniture", "Knoll Extra"),
      make(4, "furniture"),
    ]);
    const result = await listProducts({ brand: " KNOLL " });
    expect(result.products.map((p) => p.id)).toEqual([1, 2]);
    expect(result.total).toBe(2);
    // busca o escopo inteiro (limit 0) para filtrar no cliente
    expect(get).toHaveBeenCalledWith(
      "/products",
      expect.objectContaining({ params: expect.objectContaining({ limit: 0, skip: 0 }) }),
    );
  });

  it("combina categoria e marca usando o endpoint da categoria", async () => {
    const get = respond([make(1, "furniture", "Knoll"), make(2, "furniture", "Acme")]);
    const result = await listProducts({ category: "furniture", brand: "Acme" });
    expect(result.products.map((p) => p.id)).toEqual([2]);
    expect(get).toHaveBeenCalledWith("/products/category/furniture", expect.anything());
  });

  it("pagina localmente o resultado filtrado e informa o total real", async () => {
    respond(Array.from({ length: 30 }, (_, i) => make(i + 1, "beauty", "Acme")));
    const page3 = await listProducts({ brand: "Acme", page: 3 });
    expect(page3.total).toBe(30);
    expect(page3.products).toHaveLength(6); // 30 - 2 páginas de 12
    expect(page3.skip).toBe(24);
  });

  it("página fora do intervalo devolve lista vazia com o total", async () => {
    respond([make(1, "beauty", "Acme")]);
    const result = await listProducts({ brand: "Acme", page: 9 });
    expect(result.products).toEqual([]);
    expect(result.total).toBe(1);
  });

  it("marca inexistente devolve vazio", async () => {
    respond([make(1, "beauty", "Acme")]);
    expect((await listProducts({ brand: "Nope" })).total).toBe(0);
  });

  it("busca + categoria filtra o conjunto completo, não só a primeira página", async () => {
    respond([make(1, "beauty"), make(2, "furniture"), make(3, "furniture")]);
    const result = await listProducts({ search: "x", category: "furniture" });
    expect(result.products.map((p) => p.id)).toEqual([2, 3]);
    expect(result.total).toBe(2);
  });

  describe("ordenação", () => {
    it("no servidor (avaliação/nome), repassa sortBy/order e mantém a paginação da API", async () => {
      const get = respond([make(1, "beauty")]);
      await listProducts({ sort: "avaliacao", page: 2 });
      expect(get).toHaveBeenCalledWith(
        "/products",
        expect.objectContaining({
          params: expect.objectContaining({
            sortBy: "rating",
            order: "desc",
            limit: PAGE_SIZE,
            skip: PAGE_SIZE,
          }),
        }),
      );
    });

    it("sem ordenação não envia sortBy/order", async () => {
      const get = respond([make(1, "beauty")]);
      await listProducts({});
      const params = (get.mock.calls[0][1] as { params: Record<string, unknown> }).params;
      expect(params).not.toHaveProperty("sortBy");
      expect(params).not.toHaveProperty("order");
    });

    it("preço é ordenado no cliente pelo valor COM desconto (a API usa o preço de tabela)", async () => {
      const tabelaBarato = { ...make(1, "beauty"), price: 10, discountPercentage: 0 }; // final 10
      const tabelaCaro = { ...make(2, "beauty"), price: 12, discountPercentage: 50 }; // final 6
      const get = respond([tabelaBarato, tabelaCaro]);
      const result = await listProducts({ sort: "preco-asc" });
      expect(result.products.map((p) => p.id)).toEqual([2, 1]);
      const params = (get.mock.calls[0][1] as { params: Record<string, unknown> }).params;
      expect(params).toMatchObject({ limit: 0, skip: 0 });
      expect(params).not.toHaveProperty("sortBy");
    });

    it("com filtro de marca (cliente), ordena localmente e não envia sortBy", async () => {
      const cheap = { ...make(1, "beauty", "Acme"), price: 5 };
      const pricey = { ...make(2, "beauty", "Acme"), price: 50 };
      const get = respond([pricey, cheap]);
      const result = await listProducts({ brand: "Acme", sort: "preco-asc" });
      expect(result.products.map((p) => p.id)).toEqual([1, 2]);
      expect(
        (get.mock.calls[0][1] as { params: Record<string, unknown> }).params,
      ).not.toHaveProperty("sortBy");
    });
  });
});

describe("listProducts: filtros avançados", () => {
  afterEach(() => vi.restoreAllMocks());

  const catalog = [
    { ...make(1, "beauty", "Acme"), price: 100, discountPercentage: 50, rating: 4.8, stock: 5 },
    { ...make(2, "beauty", "Acme"), price: 40, rating: 3.1, stock: 0 },
    { ...make(3, "furniture"), price: 300, rating: 4.9, stock: 9 },
  ];
  const respondAll = () =>
    vi.spyOn(api, "get").mockResolvedValue({
      data: { products: catalog, total: 3, skip: 0, limit: 3 },
    });

  it("busca o escopo inteiro (limit 0) e filtra por preço final, nota e estoque", async () => {
    const get = respondAll();
    const result = await listProducts({
      filters: { minPrice: 45, minRating: 4, inStockOnly: true },
    });
    expect(result.products.map((p) => p.id)).toEqual([1, 3]); // 1: 100−50% = 50; 2 sai (esgotado e nota 3,1)
    expect(result.total).toBe(2);
    expect(get).toHaveBeenCalledWith(
      "/products",
      expect.objectContaining({ params: expect.objectContaining({ limit: 0, skip: 0 }) }),
    );
  });

  it("combina com categoria, marca e ordenação, paginando o resultado filtrado", async () => {
    respondAll();
    const result = await listProducts({
      category: "beauty",
      brand: "Acme",
      filters: { maxPrice: 60 },
      sort: "preco-asc",
    });
    expect(result.products.map((p) => p.id)).toEqual([2, 1]); // 40 e 50
  });

  it("filtros vazios mantêm a paginação no servidor", async () => {
    const get = respondAll();
    await listProducts({ filters: {} });
    expect(get).toHaveBeenCalledWith(
      "/products",
      expect.objectContaining({ params: expect.objectContaining({ limit: PAGE_SIZE }) }),
    );
  });

  it("nenhum produto atende: lista vazia com total 0", async () => {
    respondAll();
    const result = await listProducts({ filters: { minPrice: 10_000 } });
    expect(result).toMatchObject({ products: [], total: 0 });
  });
});

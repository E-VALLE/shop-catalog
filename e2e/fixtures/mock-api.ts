import { test as base, type Page, type Route } from "@playwright/test";

/**
 * API falsa (DummyJSON + câmbio) interceptada no navegador: e2e rápidos, determinísticos e
 * independentes de rede/limite de terceiros. O smoke test com a API real fica em e2e/real.
 */

const thumbnail = (label: string) =>
  `data:image/svg+xml;utf8,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200"><rect width="200" height="200" fill="#e9ecef"/><text x="100" y="105" text-anchor="middle" font-size="14">${label}</text></svg>`,
  )}`;

interface MockProduct {
  id: number;
  title: string;
  description: string;
  category: string;
  price: number;
  discountPercentage: number;
  rating: number;
  stock: number;
  brand: string;
  thumbnail: string;
  images: string[];
  reviews: { rating: number; comment: string; date: string; reviewerName: string }[];
}

const CATEGORIES = [
  { slug: "beauty", titles: "Essence Mascara" },
  { slug: "laptops", titles: "Pro Laptop" },
  { slug: "smartphones", titles: "Super Phone" },
  { slug: "furniture", titles: "Oak Chair" },
] as const;

export const PRODUCTS: MockProduct[] = CATEGORIES.flatMap(({ slug, titles }, ci) =>
  Array.from({ length: 12 }, (_, i) => {
    const id = ci * 12 + i + 1;
    return {
      id,
      title: `${titles} ${i + 1}`,
      description: `${titles} número ${i + 1}, descrição longa o bastante para o formulário.`,
      category: slug,
      price: 10 + id,
      discountPercentage: id === 1 ? 15 : id === 3 ? 0 : 10,
      rating: 3 + (id % 3) * 0.7, // 3,0 · 3,7 · 4,4 (variedade para o filtro de avaliação)
      stock: id === 1 ? 3 : id === 2 ? 0 : 25, // 1: poucas unidades, 2: esgotado
      brand: i < 2 ? "Acme" : "Zeta", // "Acme" existe em todas as categorias
      thumbnail: thumbnail(`#${id}`),
      images: [thumbnail(`#${id}-a`), thumbnail(`#${id}-b`), thumbnail(`#${id}-c`)],
      // produto 1: 5 avaliações; produto 2: nenhuma; demais: 2
      reviews: Array.from({ length: id === 1 ? 5 : id === 2 ? 0 : 2 }, (_, r) => ({
        rating: 3 + (r % 3),
        comment: `Avaliação ${r + 1} do produto ${id}`,
        date: "2025-05-23T08:56:21.618Z",
        reviewerName: `Cliente ${r + 1}`,
      })),
    };
  }),
);

const CORS = {
  "access-control-allow-origin": "*",
  "access-control-allow-headers": "*",
  "access-control-allow-methods": "GET,POST,PUT,DELETE,OPTIONS",
};

const json = (route: Route, body: unknown, status = 200) =>
  route.fulfill({
    status,
    headers: CORS,
    contentType: "application/json",
    body: JSON.stringify(body),
  });

function page_(items: MockProduct[], params: URLSearchParams) {
  const sortBy = params.get("sortBy") as keyof MockProduct | null;
  if (sortBy) {
    const direction = params.get("order") === "desc" ? -1 : 1;
    items = [...items].sort((a, b) => {
      const [x, y] = [a[sortBy], b[sortBy]];
      return (
        (typeof x === "string" ? x.localeCompare(String(y)) : Number(x) - Number(y)) * direction
      );
    });
  }
  const limit = Number(params.get("limit") ?? 30);
  const skip = Number(params.get("skip") ?? 0);
  const slice = limit === 0 ? items.slice(skip) : items.slice(skip, skip + limit);
  return { products: slice, total: items.length, skip, limit: slice.length };
}

async function handleDummyJson(route: Route) {
  const request = route.request();
  if (request.method() === "OPTIONS") return route.fulfill({ status: 204, headers: CORS });

  const url = new URL(request.url());
  const path = url.pathname;
  const params = url.searchParams;

  if (path === "/auth/login" && request.method() === "POST") {
    const { username, password } = request.postDataJSON() as { username: string; password: string };
    if (username === "emilys" && password === "emilyspass") {
      return json(route, {
        id: 1,
        username,
        firstName: "Emily",
        lastName: "Johnson",
        accessToken: "mock-access-token",
      });
    }
    if (username === "averyp" && password === "averyppass") {
      return json(route, {
        id: 16,
        username,
        firstName: "Avery",
        lastName: "Perez",
        accessToken: "mock-customer-token",
      });
    }
    return json(route, { message: "Invalid credentials" }, 400);
  }
  // Papel do usuário logado, decidido pelo token que o login simulado entregou.
  if (path === "/auth/me") {
    const token = request.headers()["authorization"] ?? "";
    if (token === "Bearer mock-access-token") return json(route, { id: 1, role: "admin" });
    if (token === "Bearer mock-customer-token") return json(route, { id: 16, role: "user" });
    return json(route, { message: "Invalid token" }, 401);
  }
  if (path === "/products/categories") {
    return json(
      route,
      CATEGORIES.map(({ slug }) => ({
        slug,
        name: slug,
        url: `https://dummyjson.com/products/category/${slug}`,
      })),
    );
  }
  if (path === "/products/search") {
    const q = (params.get("q") ?? "").toLowerCase();
    return json(
      route,
      page_(
        PRODUCTS.filter((p) => p.title.toLowerCase().includes(q)),
        params,
      ),
    );
  }
  if (path.startsWith("/products/category/")) {
    const slug = decodeURIComponent(path.split("/").pop() ?? "");
    return json(
      route,
      page_(
        PRODUCTS.filter((p) => p.category === slug),
        params,
      ),
    );
  }
  if (path === "/products/add" && request.method() === "POST") {
    return json(route, { id: PRODUCTS.length + 1, ...(request.postDataJSON() as object) }, 201);
  }
  if (path === "/products") return json(route, page_(PRODUCTS, params));

  const match = /^\/products\/(\d+)$/.exec(path);
  if (match) {
    const product = PRODUCTS.find((p) => p.id === Number(match[1]));
    if (!product) return json(route, { message: `Product with id '${match[1]}' not found` }, 404);
    if (request.method() === "DELETE") return json(route, { ...product, isDeleted: true });
    if (request.method() === "PUT")
      return json(route, { ...product, ...(request.postDataJSON() as object) });
    return json(route, product);
  }
  return json(route, { message: `rota não mockada: ${path}` }, 404);
}

export async function mockApis(page: Page) {
  await page.route(/https:\/\/dummyjson\.com\//, handleDummyJson);
  await page.route(/economia\.awesomeapi\.com\.br/, (route) =>
    json(route, { USDBRL: { bid: "5.0000", timestamp: "1790975912" } }),
  );
  await page.route(/api\.frankfurter\.dev/, (route) =>
    json(route, { amount: 1, base: "USD", date: "2026-10-02", rates: { BRL: 5 } }),
  );
}

export const test = base.extend<{ mockedApis: void }>({
  mockedApis: [
    async ({ page }, use) => {
      await mockApis(page);
      await use();
    },
    { auto: true },
  ],
});

export { expect } from "@playwright/test";

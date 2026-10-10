import { expect, test } from "./fixtures/mock-api";

// Aqui o service worker fica ligado (nos demais specs é bloqueado para não atrapalhar os mocks).
test.use({ serviceWorkers: "allow" });

test.describe("PWA", () => {
  test("o ícone da aba é o carrinho da loja (não o logotipo padrão do Vite)", async ({
    page,
    request,
  }) => {
    await page.goto("");
    const href = await page.locator('link[rel="icon"]').getAttribute("href");
    expect(href).toBe("/shop-catalog/favicon.svg");
    const response = await request.get(href!);
    expect(response.ok()).toBe(true);
    expect(response.headers()["content-type"]).toContain("image/svg+xml");
    const svg = await response.text();
    expect(svg).toContain("<title>Shop Catalog</title>");
    expect(svg).not.toContain("#863bff"); // roxo do raio do template do Vite
  });

  test("publica um manifesto válido com ícones acessíveis", async ({ page, request }) => {
    await page.goto("");
    const href = await page.locator('link[rel="manifest"]').getAttribute("href");
    expect(href).toBe("/shop-catalog/manifest.webmanifest");

    const manifest = await (await request.get(href!)).json();
    expect(manifest).toMatchObject({
      name: "Shop Catalog",
      display: "standalone",
      start_url: "/shop-catalog/",
      scope: "/shop-catalog/",
    });
    const sizes = manifest.icons.map((icon: { sizes: string }) => icon.sizes);
    expect(sizes).toEqual(expect.arrayContaining(["192x192", "512x512"]));
    for (const icon of manifest.icons) {
      const response = await request.get(`/shop-catalog/${icon.src}`);
      expect(response.ok(), icon.src).toBe(true);
      expect(response.headers()["content-type"]).toContain("image/png");
    }
  });

  test("o service worker assume a página e o app abre offline", async ({ page, context }) => {
    await page.goto("");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await page.evaluate(() => navigator.serviceWorker.ready);
    // clients.claim() faz o worker controlar a aba logo depois de ativado
    await expect.poll(() => page.evaluate(() => !!navigator.serviceWorker.controller)).toBe(true);

    await context.setOffline(true);
    await page.reload();
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(page.getByRole("link", { name: /Shop Catalog/ }).first()).toBeVisible();
    await context.setOffline(false);
  });
});

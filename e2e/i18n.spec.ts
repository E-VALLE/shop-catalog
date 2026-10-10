import { expect, test } from "./fixtures/mock-api";

test.describe("idioma no primeiro acesso", () => {
  test.describe("navegador em inglês", () => {
    test.use({ locale: "en-US", timezoneId: "America/New_York" });

    test("abre em inglês e permite trocar para português (persistindo)", async ({ page }) => {
      await page.goto("");
      await expect(
        page.getByRole("heading", { name: "Find the perfect product", level: 1 }),
      ).toBeVisible();
      await expect(page.locator("html")).toHaveAttribute("lang", "en");

      await page.getByRole("button", { name: /Language/ }).click();
      await page.getByRole("menuitem", { name: "Português (Brasil)" }).click();
      await expect(
        page.getByRole("heading", { name: "Encontre o produto ideal", level: 1 }),
      ).toBeVisible();

      await page.reload();
      await expect(
        page.getByRole("heading", { name: "Encontre o produto ideal", level: 1 }),
      ).toBeVisible();
      await expect(page.locator("html")).toHaveAttribute("lang", "pt-BR");
    });
  });

  test.describe("navegador em português (Brasil)", () => {
    test.use({ locale: "pt-BR", timezoneId: "America/Sao_Paulo" });

    test("abre em português e troca para inglês", async ({ page }) => {
      await page.goto("");
      await expect(
        page.getByRole("heading", { name: "Encontre o produto ideal", level: 1 }),
      ).toBeVisible();

      await page.getByRole("button", { name: /Idioma/ }).click();
      await page.getByRole("menuitem", { name: "English" }).click();
      await expect(
        page.getByRole("heading", { name: "Find the perfect product", level: 1 }),
      ).toBeVisible();
    });
  });
});

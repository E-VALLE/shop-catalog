import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "./fixtures/mock-api";

test("formulário de novo produto tem painel com fundo suave e passa no axe (claro e escuro)", async ({
  page,
}) => {
  await page.goto("login");
  await page.getByLabel("Usuário").fill("emilys");
  await page.getByLabel("Senha").fill("emilyspass");
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page).toHaveURL(/\/admin$/);
  await page.goto("admin/produtos/novo");
  const form = page.getByRole("form").or(page.locator("form")).first();
  await expect(form).toBeVisible();

  for (const scheme of ["light", "dark"] as const) {
    await page.emulateMedia({ colorScheme: scheme });
    await page.waitForTimeout(300);
    const [panel, body] = await Promise.all([
      form.evaluate((el) => getComputedStyle(el.closest(".mantine-Card-root")!).backgroundColor),
      page.evaluate(() => getComputedStyle(document.body).backgroundColor),
    ]);
    expect(panel, scheme).not.toBe(body);
    const { violations } = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .analyze();
    expect(violations.map((v) => `${v.id}: ${v.nodes[0]?.target.join(" ")}`)).toEqual([]);
  }
});

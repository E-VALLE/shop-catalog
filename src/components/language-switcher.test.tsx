import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { LANGUAGE_KEY } from "../i18n/detect-language";
import { renderWithProviders } from "../test/render-with-providers";
import { LanguageSwitcher } from "./language-switcher";

describe("LanguageSwitcher", () => {
  it("troca para inglês, persiste a escolha e atualiza <html lang>", async () => {
    renderWithProviders(<LanguageSwitcher />);
    const trigger = screen.getByRole("button", { name: /idioma/i });
    expect(trigger).toHaveTextContent("PT-BR");

    await userEvent.click(trigger);
    await userEvent.click(await screen.findByRole("menuitem", { name: "English" }));

    expect(await screen.findByRole("button", { name: /language/i })).toHaveTextContent("EN");
    expect(localStorage.getItem(LANGUAGE_KEY)).toBe("en");
    expect(document.documentElement.lang).toBe("en");
  });

  it("marca o idioma ativo no menu", async () => {
    renderWithProviders(<LanguageSwitcher />);
    await userEvent.click(screen.getByRole("button", { name: /idioma/i }));
    expect(await screen.findByRole("menuitem", { name: "Português (Brasil)" })).toHaveAttribute(
      "aria-current",
      "true",
    );
    expect(await screen.findByRole("menuitem", { name: "English" })).not.toHaveAttribute(
      "aria-current",
    );
  });
});

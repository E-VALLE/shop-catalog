import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CURRENCY_PREF_KEY } from "../contexts/currency-provider";
import { renderWithProviders } from "../test/render-with-providers";
import { CurrencySwitcher } from "./currency-switcher";

describe("CurrencySwitcher", () => {
  it("mostra a moeda ativa (R$ em pt-BR) e permite trocar para dólar", async () => {
    renderWithProviders(<CurrencySwitcher />);
    const trigger = await screen.findByRole("button", {
      name: "Moeda: Automática (segue o idioma)",
    });
    expect(await screen.findByText("R$")).toBeInTheDocument();

    await userEvent.click(trigger);
    await userEvent.click(await screen.findByRole("menuitem", { name: "Dólar (US$)" }));

    expect(await screen.findByText("US$")).toBeInTheDocument();
    expect(localStorage.getItem(CURRENCY_PREF_KEY)).toBe("USD");
    expect(screen.getByRole("button", { name: "Moeda: Dólar (US$)" })).toBeInTheDocument();
  });

  it("marca a opção ativa no menu", async () => {
    renderWithProviders(<CurrencySwitcher />);
    await userEvent.click(await screen.findByRole("button", { name: /Moeda:/ }));
    expect(
      await screen.findByRole("menuitem", { name: "Automática (segue o idioma)" }),
    ).toHaveAttribute("aria-current", "true");
    expect(screen.getByRole("menuitem", { name: "Real (R$)" })).not.toHaveAttribute("aria-current");
  });
});

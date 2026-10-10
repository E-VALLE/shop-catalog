import { screen } from "@testing-library/react";
import { renderWithProviders } from "../test/render-with-providers";
import { NotFound } from "./not-found";

describe("NotFound", () => {
  it("explica o erro, define o título da aba e leva de volta ao início", () => {
    renderWithProviders(<NotFound />);
    expect(screen.getByRole("heading", { level: 1, name: "Página não encontrada" })).toBeVisible();
    expect(screen.getByRole("link", { name: "Voltar ao início" })).toHaveAttribute("href", "/");
    expect(document.title).toContain("Página não encontrada");
  });
});

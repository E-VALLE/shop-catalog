import { screen } from "@testing-library/react";
import { Route, Routes } from "react-router";
import { renderWithProviders } from "../test/render-with-providers";
import { AuthLayout } from "./auth-layout";

describe("AuthLayout (tela de login)", () => {
  const renderLayout = () =>
    renderWithProviders(
      <Routes>
        <Route element={<AuthLayout />}>
          <Route path="login" element={<h1>Conteúdo do login</h1>} />
        </Route>
      </Routes>,
      { route: "/login" },
    );

  it("tem a região principal (main) com o conteúdo da rota", () => {
    renderLayout();
    const main = screen.getByRole("main");
    expect(main).toHaveAttribute("id", "main-content");
    expect(main).toContainElement(screen.getByRole("heading", { name: "Conteúdo do login" }));
  });

  it("oferece o link 'Pular para o conteúdo' apontando para a região principal", () => {
    renderLayout();
    expect(screen.getByRole("link", { name: "Pular para o conteúdo" })).toHaveAttribute(
      "href",
      "#main-content",
    );
  });

  it("mantém o link de volta para a loja", () => {
    renderLayout();
    expect(screen.getByRole("link", { name: "Voltar para a loja" })).toHaveAttribute("href", "/");
  });
});

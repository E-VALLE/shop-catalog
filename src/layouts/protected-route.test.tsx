import { screen } from "@testing-library/react";
import { Route, Routes } from "react-router";
import { TOKEN_KEY } from "../services/api";
import { renderWithProviders } from "../test/render-with-providers";
import { ProtectedRoute } from "./protected-route";

function renderAt(route: string) {
  return renderWithProviders(
    <Routes>
      <Route path="/login" element={<h1>Tela de login</h1>} />
      <Route path="/admin" element={<ProtectedRoute />}>
        <Route index element={<h1>Área admin</h1>} />
      </Route>
    </Routes>,
    { route },
  );
}

function renderAdminAt(route: string) {
  return renderWithProviders(
    <Routes>
      <Route path="/login" element={<h1>Tela de login</h1>} />
      <Route path="/admin" element={<ProtectedRoute role="admin" />}>
        <Route index element={<h1>Área admin</h1>} />
      </Route>
    </Routes>,
    { route },
  );
}

const saveSession = (role?: string) => {
  localStorage.setItem(TOKEN_KEY, "tok");
  localStorage.setItem(
    "shop-catalog:user",
    JSON.stringify({ id: 1, username: "u", firstName: "U", lastName: "S", role }),
  );
};

describe("ProtectedRoute com papel exigido", () => {
  it("visitante vai para o login", () => {
    renderAdminAt("/admin");
    expect(screen.getByRole("heading", { name: "Tela de login" })).toBeInTheDocument();
  });

  it("administrador acessa", () => {
    saveSession("admin");
    renderAdminAt("/admin");
    expect(screen.getByRole("heading", { name: "Área admin" })).toBeInTheDocument();
  });

  it.each(["user", "moderator", undefined])(
    "papel %s vê Acesso restrito, não o conteúdo",
    (role) => {
      saveSession(role);
      renderAdminAt("/admin");
      expect(screen.getByRole("heading", { name: "Acesso restrito" })).toBeInTheDocument();
      expect(screen.queryByRole("heading", { name: "Área admin" })).not.toBeInTheDocument();
      expect(screen.getByRole("link", { name: "Voltar para a loja" })).toHaveAttribute("href", "/");
    },
  );
});

describe("ProtectedRoute", () => {
  it("redireciona para /login sem sessão", () => {
    renderAt("/admin");
    expect(screen.getByRole("heading", { name: "Tela de login" })).toBeInTheDocument();
  });

  it("libera o acesso com token e usuário salvos", () => {
    localStorage.setItem(TOKEN_KEY, "tok");
    localStorage.setItem(
      "shop-catalog:user",
      JSON.stringify({ id: 1, username: "u", firstName: "U", lastName: "S" }),
    );
    renderAt("/admin");
    expect(screen.getByRole("heading", { name: "Área admin" })).toBeInTheDocument();
  });

  it("não considera autenticado quando só há token sem usuário", () => {
    localStorage.setItem(TOKEN_KEY, "tok");
    renderAt("/admin");
    expect(screen.getByRole("heading", { name: "Tela de login" })).toBeInTheDocument();
  });
});

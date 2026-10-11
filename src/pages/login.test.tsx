import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AxiosError } from "axios";
import { Route, Routes } from "react-router";
import { renderWithProviders } from "../test/render-with-providers";
import * as authService from "../services/auth-service";
import { Login } from "./login";

function renderLogin() {
  return renderWithProviders(
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/admin" element={<h1>Painel admin</h1>} />
      <Route path="/" element={<h1>Loja</h1>} />
    </Routes>,
    { route: "/login" },
  );
}

describe("Login", () => {
  afterEach(() => vi.restoreAllMocks());

  it("mostra erros de validação sem chamar a API", async () => {
    const login = vi.spyOn(authService, "login");
    renderLogin();
    await userEvent.type(screen.getByLabelText(/senha/i), "123");
    await userEvent.click(screen.getByRole("button", { name: /entrar/i }));

    expect(await screen.findByText("Informe o usuário")).toBeInTheDocument();
    expect(screen.getByText(/ao menos 6 caracteres/i)).toBeInTheDocument();
    expect(login).not.toHaveBeenCalled();
  });

  it("mostra as duas contas de demonstração", () => {
    renderLogin();
    expect(screen.getByText("Demonstração")).toBeInTheDocument();
    expect(screen.getByText(/Acesso administrativo:/)).toHaveTextContent(
      "usuário emilys / senha emilyspass",
    );
    expect(screen.getByText(/Cliente com cadastro:/)).toHaveTextContent(
      "usuário averyp / senha averyppass",
    );
  });

  it("cliente é levado à loja (não ao painel) após o login", async () => {
    vi.spyOn(authService, "login").mockResolvedValue({
      id: 16,
      username: "averyp",
      firstName: "Avery",
      lastName: "P",
      accessToken: "tok",
    });
    vi.spyOn(authService, "fetchRole").mockResolvedValue("user");
    renderLogin();
    await userEvent.type(screen.getByLabelText(/usuário/i), "averyp");
    await userEvent.type(screen.getByLabelText(/senha/i), "averyppass");
    await userEvent.click(screen.getByRole("button", { name: /entrar/i }));

    expect(await screen.findByRole("heading", { name: "Loja" })).toBeInTheDocument();
  });

  it("redireciona para /admin após login de administrador", async () => {
    vi.spyOn(authService, "login").mockResolvedValue({
      id: 1,
      username: "emilys",
      firstName: "Emily",
      lastName: "J",
      accessToken: "tok",
    });
    vi.spyOn(authService, "fetchRole").mockResolvedValue("admin");
    renderLogin();
    await userEvent.type(screen.getByLabelText(/usuário/i), "emilys");
    await userEvent.type(screen.getByLabelText(/senha/i), "emilyspass");
    await userEvent.click(screen.getByRole("button", { name: /entrar/i }));

    expect(await screen.findByRole("heading", { name: "Painel admin" })).toBeInTheDocument();
  });

  it("exibe erro nos campos quando a API responde 400", async () => {
    const error = new AxiosError("Bad", "ERR_BAD_REQUEST", undefined, undefined, {
      status: 400,
      data: { message: "Invalid credentials" },
    } as never);
    vi.spyOn(authService, "login").mockRejectedValue(error);
    renderLogin();
    await userEvent.type(screen.getByLabelText(/usuário/i), "x");
    await userEvent.type(screen.getByLabelText(/senha/i), "wrongpass");
    await userEvent.click(screen.getByRole("button", { name: /entrar/i }));

    // um único alerta acima do formulário (não repetido sob cada campo)
    await waitFor(() =>
      expect(
        screen
          .getAllByRole("alert")
          .filter((el) => el.textContent?.includes("Usuário ou senha inválidos")),
      ).toHaveLength(1),
    );
    expect(screen.getAllByText("Usuário ou senha inválidos")).toHaveLength(1);
    await waitFor(() => expect(screen.getByLabelText(/usuário/i)).not.toBeInvalid());
  });
});

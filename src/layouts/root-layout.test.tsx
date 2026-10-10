import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Route, Routes } from "react-router";
import { TOKEN_KEY } from "../services/api";
import { renderWithProviders } from "../test/render-with-providers";
import { RootLayout } from "./root-layout";

const renderLayout = (route = "/") =>
  renderWithProviders(
    <Routes>
      <Route element={<RootLayout />}>
        <Route index element={<h1>Conteúdo da rota</h1>} />
        <Route path="admin" element={<h1>Conteúdo do admin</h1>} />
      </Route>
    </Routes>,
    { route },
  );

const signIn = (role: "admin" | "user" = "admin") => {
  localStorage.setItem(TOKEN_KEY, "tok");
  localStorage.setItem(
    "shop-catalog:user",
    JSON.stringify({ id: 1, username: "emilys", firstName: "Emily", lastName: "Johnson", role }),
  );
};

describe("RootLayout", () => {
  it("renderiza a rota filha, o link de pular e a navegação pública", () => {
    renderLayout();
    expect(screen.getByRole("heading", { name: "Conteúdo da rota" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Pular para o conteúdo" })).toBeInTheDocument();

    const nav = screen.getByRole("navigation", { name: "Principal" });
    expect(within(nav).getByRole("link", { name: /Início/ })).toHaveAttribute("href", "/");
    expect(within(nav).getByRole("link", { name: /Produtos/ })).toHaveAttribute(
      "href",
      "/produtos",
    );
    expect(within(nav).queryByRole("link", { name: /Dashboard/ })).not.toBeInTheDocument();
  });

  it("visitante vê o botão Entrar e não vê o menu do usuário", () => {
    renderLayout();
    expect(screen.getAllByRole("link", { name: "Entrar" })[0]).toHaveAttribute("href", "/login");
    expect(screen.queryByRole("button", { name: "Menu do usuário" })).not.toBeInTheDocument();
  });

  it("logado: mostra os links do admin e o avatar com as iniciais", () => {
    signIn();
    renderLayout();
    const nav = screen.getByRole("navigation", { name: "Principal" });
    expect(within(nav).getByRole("link", { name: /Dashboard/ })).toHaveAttribute("href", "/admin");
    expect(within(nav).getByRole("link", { name: /Gerenciar produtos/ })).toHaveAttribute(
      "href",
      "/admin/produtos",
    );
    expect(screen.getByRole("button", { name: "Menu do usuário" })).toHaveTextContent("EJ");
    expect(screen.queryByRole("link", { name: "Entrar" })).not.toBeInTheDocument();
  });

  it("cliente logado: sem links nem menu de administração, mas com Sair", async () => {
    signIn("user");
    const user = userEvent.setup();
    renderLayout();
    const nav = screen.getByRole("navigation", { name: "Principal" });
    expect(within(nav).queryByRole("link", { name: /Dashboard/ })).not.toBeInTheDocument();
    expect(within(nav).queryByRole("link", { name: /Gerenciar produtos/ })).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Menu do usuário" }));
    expect(await screen.findByRole("menuitem", { name: "Sair" })).toBeInTheDocument();
    expect(screen.queryByRole("menuitem", { name: "Administração" })).not.toBeInTheDocument();
  });

  it("logado: o menu do usuário leva à administração e permite sair", async () => {
    signIn();
    const user = userEvent.setup();
    renderLayout();

    await user.click(screen.getByRole("button", { name: "Menu do usuário" }));
    expect(await screen.findByRole("menuitem", { name: "Administração" })).toHaveAttribute(
      "href",
      "/admin",
    );
    await user.click(screen.getByRole("menuitem", { name: "Sair" }));

    expect(localStorage.getItem(TOKEN_KEY)).toBeNull();
    expect(screen.getAllByRole("link", { name: "Entrar" })[0]).toBeInTheDocument();
  });

  it("o botão de tema alterna entre claro e escuro", async () => {
    const user = userEvent.setup();
    renderLayout();
    const html = document.documentElement;
    const before = html.getAttribute("data-mantine-color-scheme");

    await user.click(screen.getByRole("button", { name: "Alternar tema" }));
    const after = html.getAttribute("data-mantine-color-scheme");
    expect(after).not.toBe(before);

    await user.click(screen.getByRole("button", { name: "Alternar tema" }));
    expect(html.getAttribute("data-mantine-color-scheme")).toBe(before);
  });

  it("os atalhos de carrinho e favoritos trazem a contagem no nome acessível", () => {
    renderLayout();
    expect(screen.getByRole("link", { name: /^Carrinho, 0 item/ })).toHaveAttribute(
      "href",
      "/carrinho",
    );
    expect(screen.getByRole("link", { name: /^Favoritos, 0 item/ })).toHaveAttribute(
      "href",
      "/favoritos",
    );
  });

  it("o menu móvel abre pelo hambúrguer", async () => {
    const user = userEvent.setup();
    renderLayout();
    const mobileNav = () => screen.getByRole("navigation", { name: "Menu mobile", hidden: true });
    expect(mobileNav()).toHaveAttribute("inert"); // fechado: fora do foco e dos leitores de tela

    await user.click(screen.getByRole("button", { name: "Abrir menu" }));
    expect(mobileNav()).not.toHaveAttribute("inert");
  });
});

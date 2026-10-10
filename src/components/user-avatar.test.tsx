import { screen } from "@testing-library/react";
import { renderWithProviders } from "../test/render-with-providers";
import { UserAvatar } from "./user-avatar";

const render = (firstName: string, lastName: string, username = "u") =>
  renderWithProviders(<UserAvatar user={{ firstName, lastName, username }} />);

describe("UserAvatar", () => {
  it("mostra as iniciais de nome e sobrenome", () => {
    render("Emily", "Johnson", "emilys");
    expect(screen.getByText("EJ")).toBeInTheDocument();
  });

  it("com uma só palavra usa as duas primeiras letras", () => {
    render("Madonna", "");
    expect(screen.getByText("MA")).toBeInTheDocument();
  });

  it("mantém letras acentuadas em maiúsculas", () => {
    render("émile", "Çelik");
    expect(screen.getByText("ÉÇ")).toBeInTheDocument();
  });

  it("sem nome, usa o username", () => {
    render("", "", "operador");
    expect(screen.getByText("OP")).toBeInTheDocument();
  });
});

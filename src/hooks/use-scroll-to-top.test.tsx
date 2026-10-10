import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Link, MemoryRouter, Route, Routes, useNavigate } from "react-router";
import { useScrollToTop } from "./use-scroll-to-top";

function Shell() {
  useScrollToTop();
  const navigate = useNavigate();
  return (
    <>
      <Link to="/produtos/1">detalhes</Link>
      <Link to="/produtos?q=phone">buscar</Link>
      <button onClick={() => navigate(-1)}>voltar</button>
      <Routes>
        <Route path="/produtos" element={<p>lista</p>} />
        <Route path="/produtos/:id" element={<p>detalhe</p>} />
      </Routes>
    </>
  );
}

const renderShell = (initial = "/produtos") =>
  render(
    <MemoryRouter initialEntries={[initial]}>
      <Shell />
    </MemoryRouter>,
  );

describe("useScrollToTop", () => {
  let scrollTo: ReturnType<typeof vi.spyOn>;
  beforeEach(() => {
    scrollTo = vi.spyOn(window, "scrollTo").mockImplementation(() => {});
  });
  afterEach(() => vi.restoreAllMocks());

  it("não rola na primeira renderização", () => {
    renderShell();
    expect(scrollTo).not.toHaveBeenCalled();
  });

  it("ao mudar de rota (lista → detalhes) leva ao topo", async () => {
    renderShell();
    await userEvent.click(screen.getByRole("link", { name: "detalhes" }));
    expect(await screen.findByText("detalhe")).toBeInTheDocument();
    expect(scrollTo).toHaveBeenCalledTimes(1);
    expect(scrollTo).toHaveBeenCalledWith(0, 0);
  });

  it("mudar só a busca na mesma rota não rola (o usuário mantém a posição)", async () => {
    renderShell();
    await userEvent.click(screen.getByRole("link", { name: "buscar" }));
    expect(scrollTo).not.toHaveBeenCalled();
  });

  it("voltar não força o topo: o navegador restaura a posição de antes", async () => {
    renderShell();
    await userEvent.click(screen.getByRole("link", { name: "detalhes" }));
    scrollTo.mockClear();
    await userEvent.click(screen.getByRole("button", { name: "voltar" }));
    expect(await screen.findByText("lista")).toBeInTheDocument();
    expect(scrollTo).not.toHaveBeenCalled();
  });
});

import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { renderWithProviders } from "../test/render-with-providers";
import { ErrorBoundary } from "./error-boundary";
import { ErrorFallback } from "./error-fallback";

function Bomb({ explode }: { explode: boolean }) {
  if (explode) throw new Error("boom");
  return <p>conteúdo ok</p>;
}

function Harness() {
  const [explode, setExplode] = useState(true);
  return (
    <>
      <button onClick={() => setExplode(false)}>consertar</button>
      <ErrorBoundary fallback={(reset) => <ErrorFallback onRetry={reset} />}>
        <Bomb explode={explode} />
      </ErrorBoundary>
    </>
  );
}

describe("ErrorBoundary", () => {
  beforeEach(() => {
    vi.spyOn(console, "error").mockImplementation(() => {});
  });
  afterEach(() => vi.restoreAllMocks());

  it("mostra o fallback acessível em vez de quebrar a tela", () => {
    renderWithProviders(<Harness />);
    expect(screen.getByRole("alert")).toHaveTextContent("Não foi possível exibir esta página");
  });

  it("permite tentar novamente depois que a causa some", async () => {
    renderWithProviders(<Harness />);
    await userEvent.click(screen.getByRole("button", { name: "consertar" }));
    await userEvent.click(screen.getByRole("button", { name: "Tentar novamente" }));
    expect(await screen.findByText("conteúdo ok")).toBeInTheDocument();
  });

  it("limpa o erro quando resetKey muda (navegação)", async () => {
    function Nav() {
      const [route, setRoute] = useState("/quebrada");
      return (
        <>
          <button onClick={() => setRoute("/ok")}>navegar</button>
          <ErrorBoundary resetKey={route} fallback={() => <p>falhou</p>}>
            <Bomb explode={route === "/quebrada"} />
          </ErrorBoundary>
        </>
      );
    }
    renderWithProviders(<Nav />);
    expect(screen.getByText("falhou")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "navegar" }));
    expect(await screen.findByText("conteúdo ok")).toBeInTheDocument();
  });
});

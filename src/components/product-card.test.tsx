import { act, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Route, Routes } from "react-router";
import type { Product } from "../schemas/product-schema";
import { renderWithProviders } from "../test/render-with-providers";
import { ProductCard } from "./product-card";

const product: Product = {
  id: 14,
  title: "Knoll Chair",
  description: "d",
  category: "furniture",
  price: 100,
  thumbnail: "t.png",
  images: [],
};

function renderCard() {
  return renderWithProviders(
    <Routes>
      <Route path="/" element={<ProductCard product={product} />} />
      <Route path="/produtos/:id" element={<h1>Detalhes do produto</h1>} />
    </Routes>,
  );
}

describe("ProductCard: imagem como atalho para os detalhes", () => {
  it("a imagem aponta para o mesmo destino do botão Detalhes", () => {
    const { container } = renderCard();
    const detailsHref = screen.getByRole("link", { name: "Detalhes" }).getAttribute("href");
    const imageLink = container.querySelector("a[aria-hidden='true']");
    expect(detailsHref).toBe("/produtos/14");
    expect(imageLink).toHaveAttribute("href", detailsHref);
  });

  it("clicar na imagem abre os detalhes", async () => {
    const { container } = renderCard();
    await userEvent.click(container.querySelector("img")!);
    expect(await screen.findByRole("heading", { name: "Detalhes do produto" })).toBeInTheDocument();
  });

  it("não duplica o link para leitores de tela nem a ordem de tabulação", () => {
    const { container } = renderCard();
    expect(screen.getAllByRole("link", { name: "Detalhes" })).toHaveLength(1);
    expect(container.querySelector("a[aria-hidden='true']")).toHaveAttribute("tabindex", "-1");
  });

  it("carrega a imagem de forma preguiçosa", () => {
    const { container } = renderCard();
    const image = container.querySelector("img");
    expect(image).toHaveAttribute("loading", "lazy");
    expect(image).toHaveAttribute("decoding", "async");
  });

  describe("selos de desconto e estoque", () => {
    const renderWith = (overrides: Partial<Product>) =>
      renderWithProviders(<ProductCard product={{ ...product, ...overrides }} />);

    it("mostra o desconto arredondado, com texto acessível", () => {
      renderWith({ discountPercentage: 14.6 });
      expect(screen.getByLabelText("15% de desconto")).toHaveTextContent("-15%");
    });

    it("sem desconto relevante não mostra selo", () => {
      renderWith({ discountPercentage: 0.3 });
      expect(screen.queryByLabelText(/de desconto/)).not.toBeInTheDocument();
    });

    it("poucas unidades: avisa quantas restam (singular e plural)", () => {
      const { unmount } = renderWith({ stock: 3 });
      expect(screen.getByText("Restam 3")).toBeInTheDocument();
      unmount();
      renderWith({ stock: 1 });
      expect(screen.getByText("Resta 1")).toBeInTheDocument();
    });

    it("estoque confortável não mostra aviso", () => {
      renderWith({ stock: 50 });
      expect(screen.queryByText(/Resta/)).not.toBeInTheDocument();
      expect(screen.queryByText("Esgotado")).not.toBeInTheDocument();
    });

    it("esgotado: mostra o selo e desabilita Comprar, mas Detalhes continua ativo", () => {
      renderWith({ stock: 0 });
      expect(screen.getByText("Esgotado")).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: /Adicionar Knoll Chair ao carrinho/ }),
      ).toBeDisabled();
      expect(screen.getByRole("link", { name: "Detalhes" })).toBeInTheDocument();
    });

    it("estoque desconhecido não mostra aviso e permite comprar", () => {
      renderWith({ stock: undefined });
      expect(screen.queryByText("Esgotado")).not.toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: /Adicionar Knoll Chair ao carrinho/ }),
      ).toBeEnabled();
    });
  });

  describe("imagem de reserva (placeholder)", () => {
    const renderWith = (thumbnail: string) =>
      renderWithProviders(<ProductCard product={{ ...product, thumbnail }} />);

    const PLACEHOLDER = /^data:image\/svg\+xml/;

    it("produto sem foto (ex.: criado no admin) mostra o placeholder, não um quadro vazio", () => {
      const { container } = renderWith("");
      expect(container.querySelector("img")?.getAttribute("src")).toMatch(PLACEHOLDER);
    });

    it("se a imagem falhar ao carregar, troca pelo placeholder", async () => {
      const { container } = renderWith("quebrada.png");
      const image = container.querySelector("img")!;
      expect(image).toHaveAttribute("src", "quebrada.png");
      await act(async () => {
        image.dispatchEvent(new Event("error"));
      });
      expect(container.querySelector("img")?.getAttribute("src")).toMatch(PLACEHOLDER);
    });

    it("com foto válida mantém a original", () => {
      const { container } = renderWith("ok.png");
      expect(container.querySelector("img")).toHaveAttribute("src", "ok.png");
    });
  });
});

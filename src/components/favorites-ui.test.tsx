import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import i18n from "../i18n";
import type { Product } from "../schemas/product-schema";
import { renderWithProviders } from "../test/render-with-providers";
import { FavoriteButton } from "./favorite-button";
import { ProductCard } from "./product-card";
import { ProductGallery } from "./product-gallery";

const product: Product = {
  id: 7,
  title: "Cadeira",
  description: "d",
  category: "furniture",
  price: 10,
  thumbnail: "t.png",
  images: [],
};

describe("FavoriteButton", () => {
  it("alterna aria-pressed e o rótulo (que cita o produto)", async () => {
    renderWithProviders(<FavoriteButton product={product} />);
    const button = screen.getByRole("button", { name: "Adicionar Cadeira aos favoritos" });
    expect(button).toHaveAttribute("aria-pressed", "false");

    await userEvent.click(button);
    const pressed = screen.getByRole("button", { name: "Remover Cadeira dos favoritos" });
    expect(pressed).toHaveAttribute("aria-pressed", "true");

    await userEvent.click(pressed);
    expect(screen.getByRole("button", { name: "Adicionar Cadeira aos favoritos" })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
  });

  it("traduz o rótulo", async () => {
    await i18n.changeLanguage("en");
    renderWithProviders(<FavoriteButton product={product} />);
    expect(screen.getByRole("button", { name: "Add Cadeira to favorites" })).toBeInTheDocument();
  });

  it("o card mostra o coração e favoritar não navega nem compra", async () => {
    renderWithProviders(<ProductCard product={product} />);
    await userEvent.click(screen.getByRole("button", { name: "Adicionar Cadeira aos favoritos" }));
    expect(
      screen.getByRole("button", { name: "Remover Cadeira dos favoritos" }),
    ).toBeInTheDocument();
    expect(localStorage.getItem("shop-catalog:cart")).not.toContain("Cadeira");
  });
});

describe("ProductGallery", () => {
  const imageSrc = (container: HTMLElement) =>
    container.querySelector("img[alt='Cadeira']")?.getAttribute("src");

  it("com uma única imagem não mostra miniaturas", () => {
    renderWithProviders(<ProductGallery title="Cadeira" thumbnail="t.png" images={["a.png"]} />);
    expect(screen.queryByRole("group", { name: "Imagens do produto" })).not.toBeInTheDocument();
  });

  it("sem images usa a miniatura como imagem principal", () => {
    const { container } = renderWithProviders(
      <ProductGallery title="Cadeira" thumbnail="t.png" images={[]} />,
    );
    expect(imageSrc(container)).toBe("t.png");
  });

  it("troca a imagem principal ao escolher uma miniatura e marca a selecionada", async () => {
    const { container } = renderWithProviders(
      <ProductGallery title="Cadeira" thumbnail="t.png" images={["a.png", "b.png", "c.png"]} />,
    );
    expect(imageSrc(container)).toBe("a.png");
    expect(screen.getByRole("button", { name: "Ver imagem 1 de 3" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );

    await userEvent.click(screen.getByRole("button", { name: "Ver imagem 3 de 3" }));
    expect(imageSrc(container)).toBe("c.png");
    expect(screen.getByRole("button", { name: "Ver imagem 3 de 3" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(screen.getByRole("button", { name: "Ver imagem 1 de 3" })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
  });

  it("ignora imagens repetidas", () => {
    renderWithProviders(
      <ProductGallery title="Cadeira" thumbnail="t.png" images={["a.png", "a.png", "b.png"]} />,
    );
    expect(screen.getAllByRole("button", { name: /Ver imagem/ })).toHaveLength(2);
  });
});

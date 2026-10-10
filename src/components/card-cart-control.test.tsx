import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CART_KEY } from "../contexts/cart-provider";
import type { Product } from "../schemas/product-schema";
import { renderWithProviders } from "../test/render-with-providers";
import { CardCartControl } from "./card-cart-control";

const product: Product = {
  id: 5,
  title: "Cadeira",
  description: "d",
  category: "furniture",
  price: 100,
  discountPercentage: 10,
  stock: 3,
  thumbnail: "t.png",
  images: [],
};

const stored = () => JSON.parse(localStorage.getItem(CART_KEY) ?? "[]");

describe("CardCartControl", () => {
  it("começa como botão Comprar; ao comprar vira um seletor − 1 +", async () => {
    renderWithProviders(<CardCartControl product={product} />);
    await userEvent.click(screen.getByRole("button", { name: "Adicionar Cadeira ao carrinho" }));

    expect(screen.queryByRole("button", { name: /Adicionar Cadeira/ })).not.toBeInTheDocument();
    expect(screen.getByRole("group", { name: "Quantidade de Cadeira" })).toHaveTextContent("1");
    // o preço salvo já tem o desconto, e o de tabela fica guardado para o resumo do pedido
    expect(stored()[0]).toMatchObject({ id: 5, price: 90, listPrice: 100, quantity: 1 });
  });

  it("aumenta e diminui a quantidade", async () => {
    renderWithProviders(<CardCartControl product={product} />);
    await userEvent.click(screen.getByRole("button", { name: "Adicionar Cadeira ao carrinho" }));
    await userEvent.click(screen.getByRole("button", { name: "Aumentar quantidade de Cadeira" }));
    await userEvent.click(screen.getByRole("button", { name: "Aumentar quantidade de Cadeira" }));
    expect(screen.getByRole("group", { name: "Quantidade de Cadeira" })).toHaveTextContent("3");

    await userEvent.click(screen.getByRole("button", { name: "Diminuir quantidade de Cadeira" }));
    expect(screen.getByRole("group", { name: "Quantidade de Cadeira" })).toHaveTextContent("2");
    expect(stored()[0].quantity).toBe(2);
  });

  it("não passa do estoque: o + fica desabilitado no limite", async () => {
    renderWithProviders(<CardCartControl product={{ ...product, stock: 2 }} />);
    await userEvent.click(screen.getByRole("button", { name: "Adicionar Cadeira ao carrinho" }));
    await userEvent.click(screen.getByRole("button", { name: "Aumentar quantidade de Cadeira" }));
    const plus = screen.getByRole("button", { name: "Aumentar quantidade de Cadeira" });
    expect(plus).toBeDisabled();
    expect(plus).toHaveAttribute("title", "Quantidade máxima em estoque");
    expect(stored()[0].quantity).toBe(2);
  });

  it("diminuir de 1 remove o item (com aviso para desfazer) e volta ao botão Comprar", async () => {
    renderWithProviders(<CardCartControl product={product} />);
    await userEvent.click(screen.getByRole("button", { name: "Adicionar Cadeira ao carrinho" }));
    await userEvent.click(screen.getByRole("button", { name: "Diminuir quantidade de Cadeira" }));

    expect(
      await screen.findByRole("button", { name: "Adicionar Cadeira ao carrinho" }),
    ).toBeInTheDocument();
    expect(stored()).toEqual([]);

    await userEvent.click(await screen.findByRole("button", { name: "Desfazer" }));
    expect(await screen.findByRole("group", { name: "Quantidade de Cadeira" })).toHaveTextContent(
      "1",
    );
  });

  it("produto esgotado não pode ser comprado", () => {
    renderWithProviders(<CardCartControl product={{ ...product, stock: 0 }} />);
    expect(screen.getByRole("button", { name: "Adicionar Cadeira ao carrinho" })).toBeDisabled();
  });

  it("reflete o carrinho salvo: já vem como seletor quando o item está no carrinho", () => {
    localStorage.setItem(
      CART_KEY,
      JSON.stringify([{ id: 5, title: "Cadeira", price: 90, thumbnail: "t", quantity: 2 }]),
    );
    renderWithProviders(<CardCartControl product={product} />);
    expect(screen.getByRole("group", { name: "Quantidade de Cadeira" })).toHaveTextContent("2");
  });
});

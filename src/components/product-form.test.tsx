import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ProductFormValues } from "../schemas/product-schema";
import { renderWithProviders } from "../test/render-with-providers";
import { ProductForm } from "./product-form";

const categories = [
  { slug: "beauty", name: "Beauty", url: "" },
  { slug: "furniture", name: "Furniture", url: "" },
];

const valid: ProductFormValues = {
  title: "Cadeira de escritório",
  description: "Cadeira ergonômica com ajuste de altura",
  category: "furniture",
  price: 120.5,
  stock: 7,
};

function setup(props: Partial<React.ComponentProps<typeof ProductForm>> = {}) {
  const onSubmit = vi.fn();
  const view = renderWithProviders(
    <ProductForm categories={categories} submitLabel="Salvar" onSubmit={onSubmit} {...props} />,
  );
  return { onSubmit, ...view };
}

describe("ProductForm", () => {
  it("mostra todos os erros (traduzidos) ao enviar vazio e não chama onSubmit", async () => {
    const { onSubmit } = setup();
    await userEvent.click(screen.getByRole("button", { name: "Salvar" }));

    expect(await screen.findByText("O título deve ter ao menos 3 caracteres")).toBeInTheDocument();
    expect(screen.getByText("A descrição deve ter ao menos 10 caracteres")).toBeInTheDocument();
    expect(screen.getByText("Selecione uma categoria")).toBeInTheDocument();
    expect(screen.getByText("Informe o preço")).toBeInTheDocument(); // vazio ≠ zero
    expect(screen.getByText("Informe o estoque")).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("preço zero é rejeitado, mas estoque zero é permitido", async () => {
    const { onSubmit } = setup({ initialValues: { ...valid, price: 0, stock: 0 } });
    await userEvent.click(screen.getByRole("button", { name: "Salvar" }));
    expect(await screen.findByText("O preço deve ser maior que zero")).toBeInTheDocument();
    expect(
      screen.queryByText(/estoque/i, { selector: "[role=alert], .mantine-InputWrapper-error" }),
    ).not.toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("título só com espaços é rejeitado", async () => {
    setup({ initialValues: { ...valid, title: "     " } });
    await userEvent.click(screen.getByRole("button", { name: "Salvar" }));
    expect(await screen.findByText("O título deve ter ao menos 3 caracteres")).toBeInTheDocument();
  });

  it("envia os valores como números quando tudo é válido", async () => {
    const { onSubmit } = setup({ initialValues: valid });
    await userEvent.click(screen.getByRole("button", { name: "Salvar" }));
    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit.mock.calls[0][0]).toEqual(valid);
    expect(typeof onSubmit.mock.calls[0][0].price).toBe("number");
  });

  it("preenche o formulário com os dados iniciais (edição)", () => {
    setup({ initialValues: valid, submitLabel: "Salvar alterações" });
    expect(screen.getByLabelText(/Título/)).toHaveValue("Cadeira de escritório");
    expect(screen.getByLabelText(/Descrição/)).toHaveValue(
      "Cadeira ergonômica com ajuste de altura",
    );
    expect(screen.getByLabelText(/Estoque/)).toHaveValue("7");
    expect(screen.getByRole("button", { name: "Salvar alterações" })).toBeInTheDocument();
  });

  it("permite escolher a categoria (ordenadas pelo nome traduzido) e digitar os campos", async () => {
    const user = userEvent.setup({ delay: null }); // sem pausa entre teclas: estável sob cobertura
    const { onSubmit } = setup();
    await user.type(screen.getByLabelText(/Título/), "Batom vermelho");
    await user.type(screen.getByLabelText(/Descrição/), "Batom de longa duração");
    await user.click(screen.getByRole("combobox", { name: /Categoria/ }));
    const options = await screen.findAllByRole("option");
    expect(options.map((o) => o.textContent)).toEqual(["Beleza", "Móveis"]);
    await user.click(screen.getByRole("option", { name: "Beleza" }));
    await user.type(screen.getByLabelText(/Preço/), "19.9");
    await user.type(screen.getByLabelText(/Estoque/), "3");

    await user.click(screen.getByRole("button", { name: "Salvar" }));
    await waitFor(() => expect(onSubmit).toHaveBeenCalled());
    expect(onSubmit.mock.calls[0][0]).toMatchObject({
      category: "beauty",
      price: 19.9,
      stock: 3,
      title: "Batom vermelho",
    });
  });

  it("mostra o equivalente em reais do preço digitado (cotação do dia)", async () => {
    setup();
    await userEvent.type(screen.getByLabelText(/Preço/), "10");
    // o helper de teste usa cotação 5: US$ 10 → R$ 50,00
    expect(await screen.findByText(/≈ R\$\s50,00 na cotação do dia/)).toBeInTheDocument();
  });

  it("Cancelar leva à lista de produtos do admin", () => {
    setup();
    expect(screen.getByRole("link", { name: "Cancelar" })).toHaveAttribute(
      "href",
      "/admin/produtos",
    );
  });

  it("durante o envio o botão principal fica em estado de carregamento", () => {
    setup({ submitting: true });
    expect(screen.getByRole("button", { name: "Salvar" })).toBeDisabled();
  });
});

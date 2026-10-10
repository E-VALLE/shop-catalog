import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useEffect } from "react";
import { FX_KEY } from "../contexts/currency-provider";
import * as csv from "../helpers/csv";
import i18n from "../i18n";
import { useAdminStore } from "../hooks/use-admin-store";
import type { Product } from "../schemas/product-schema";
import * as productsService from "../services/products-service";
import { renderWithProviders } from "../test/render-with-providers";
import { AdminProducts } from "./admin-products";

const make = (id: number, title: string, overrides: Partial<Product> = {}): Product => ({
  id,
  title,
  description: "descrição",
  category: "beauty",
  price: 10 * id,
  stock: 20,
  brand: "Acme",
  rating: 4.5,
  thumbnail: "t.png",
  images: [],
  ...overrides,
});

const catalog = [make(1, "Batom"), make(2, "Perfume"), make(3, "Esmalte")];

/** Responde tanto a página (limit 12) quanto o catálogo inteiro (limit 0), como a API. */
function mockApi(products: Product[] = catalog) {
  return vi.spyOn(productsService, "listProducts").mockImplementation(async ({ limit } = {}) => ({
    products,
    total: products.length,
    skip: 0,
    limit: limit ?? 12,
  }));
}

function SeedLocal({ product }: { product: Product }) {
  const { addCreated } = useAdminStore();
  useEffect(() => addCreated(product), [addCreated, product]);
  return null;
}

const bodyRows = () => screen.getAllByRole("row").slice(1);
const rowOf = (title: string) => screen.getByRole("row", { name: new RegExp(title) });

describe("AdminProducts: ordenação por coluna", () => {
  beforeEach(() => {
    vi.spyOn(productsService, "listCategories").mockResolvedValue([]);
  });
  afterEach(() => vi.restoreAllMocks());

  it.each([
    ["Produto", "nome", "nome-desc"],
    ["Categoria", "categoria-asc", "categoria-desc"],
    ["Preço", "tabela-asc", "tabela-desc"],
    ["Estoque", "estoque-asc", "estoque-desc"],
  ])("coluna %s: crescente → decrescente → sem ordenação", async (column, asc, desc) => {
    const list = mockApi();
    renderWithProviders(<AdminProducts />);
    const header = () => {
      const th = screen.getByRole("button", { name: `Ordenar por ${column}` }).closest("th");
      if (!th) throw new Error("cabeçalho não encontrado");
      return th;
    };
    await screen.findByRole("table");
    expect(header()).toHaveAttribute("aria-sort", "none");

    await userEvent.click(within(header()).getByRole("button"));
    await vi.waitFor(() =>
      expect(list).toHaveBeenLastCalledWith(expect.objectContaining({ sort: asc })),
    );
    expect(header()).toHaveAttribute("aria-sort", "ascending");

    await userEvent.click(within(header()).getByRole("button"));
    await vi.waitFor(() =>
      expect(list).toHaveBeenLastCalledWith(expect.objectContaining({ sort: desc })),
    );
    expect(header()).toHaveAttribute("aria-sort", "descending");

    await userEvent.click(within(header()).getByRole("button"));
    // sem ordenação: a consulta sem `sort` já estava em cache, então basta conferir o estado
    expect(header()).toHaveAttribute("aria-sort", "none");
  });

  it("lê a ordenação da URL e só uma coluna fica ordenada por vez", async () => {
    mockApi();
    renderWithProviders(<AdminProducts />, { route: "/admin/produtos?ordem=estoque-desc" });
    await screen.findByRole("table");
    const sorted = screen
      .getAllByRole("columnheader")
      .filter((h) => h.getAttribute("aria-sort") === "descending");
    expect(sorted).toHaveLength(1);
    expect(sorted[0]).toHaveTextContent("Estoque");
  });
});

describe("AdminProducts: seleção em massa", () => {
  beforeEach(() => {
    vi.spyOn(productsService, "listCategories").mockResolvedValue([]);
    mockApi();
  });
  afterEach(() => vi.restoreAllMocks());

  const checkbox = (title: string) => screen.getByRole("checkbox", { name: `Selecionar ${title}` });

  it("mostra a barra com a contagem e o checkbox do cabeçalho (indeterminado / todos)", async () => {
    renderWithProviders(<AdminProducts />);
    await screen.findByRole("table");
    expect(screen.queryByText(/selecionado/)).not.toBeInTheDocument();

    await userEvent.click(checkbox("Batom"));
    expect(screen.getByRole("region", { name: "1 selecionado" })).toBeInTheDocument();
    const all = screen.getByRole("checkbox", { name: "Selecionar todos desta página" });
    expect(all).toHaveProperty("indeterminate", true);

    await userEvent.click(all);
    expect(screen.getByText("3 selecionados")).toBeInTheDocument();
    expect(all).toBeChecked();

    await userEvent.click(all); // desmarcar todos
    expect(screen.queryByText(/selecionados/)).not.toBeInTheDocument();
  });

  it("'Limpar seleção' e mudar a ordenação zeram a seleção (ela vale só para a visão atual)", async () => {
    renderWithProviders(<AdminProducts />);
    await screen.findByRole("table");
    await userEvent.click(checkbox("Batom"));
    await userEvent.click(screen.getByRole("button", { name: "Limpar seleção" }));
    expect(screen.queryByText(/selecionado/)).not.toBeInTheDocument();

    await userEvent.click(checkbox("Batom"));
    await userEvent.click(screen.getByRole("button", { name: /Ordenar por Preço/ }));
    await vi.waitFor(() => expect(screen.queryByText(/selecionado/)).not.toBeInTheDocument());
  });

  it("exclui os selecionados com confirmação e permite desfazer", async () => {
    const remove = vi.spyOn(productsService, "deleteProduct").mockResolvedValue();
    renderWithProviders(<AdminProducts />);
    await screen.findByRole("table");
    await userEvent.click(checkbox("Batom"));
    await userEvent.click(checkbox("Perfume"));
    await userEvent.click(screen.getByRole("button", { name: "Excluir selecionados" }));

    expect((await screen.findAllByText("Excluir 2 produtos")).length).toBeGreaterThan(0);
    expect(remove).not.toHaveBeenCalled(); // só depois de confirmar
    await userEvent.click(screen.getByRole("button", { name: "Excluir" }));

    await vi.waitFor(() => expect(remove).toHaveBeenCalledTimes(2));
    expect(remove).toHaveBeenCalledWith(1);
    expect(remove).toHaveBeenCalledWith(2);
    await vi.waitFor(() => expect(bodyRows()).toHaveLength(1));
    expect(screen.getByRole("link", { name: "Esmalte" })).toBeInTheDocument();
    expect(await screen.findByText("2 produtos excluídos")).toBeInTheDocument();
    expect(screen.queryByText(/selecionados/)).not.toBeInTheDocument(); // seleção consumida

    await userEvent.click(screen.getByRole("button", { name: "Desfazer" }));
    await vi.waitFor(() => expect(bodyRows()).toHaveLength(3));
    expect(screen.getByRole("link", { name: "Batom" })).toBeInTheDocument();
  });

  it("falha parcial: exclui o que deu certo, avisa do erro e mantém a linha que falhou selecionada", async () => {
    vi.spyOn(productsService, "deleteProduct").mockImplementation(async (id) => {
      if (id === 2) throw new Error("boom");
    });
    renderWithProviders(<AdminProducts />);
    await screen.findByRole("table");
    await userEvent.click(checkbox("Batom"));
    await userEvent.click(checkbox("Perfume"));
    await userEvent.click(screen.getByRole("button", { name: "Excluir selecionados" }));
    await userEvent.click(await screen.findByRole("button", { name: "Excluir" }));

    expect(await screen.findByText("1 produto excluído")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Perfume" })).toBeInTheDocument(); // falhou: continua
    expect(screen.queryByRole("link", { name: "Batom" })).not.toBeInTheDocument();
    expect(await screen.findByText(/erro inesperado/i)).toBeInTheDocument();
    expect(screen.getByText("1 selecionado")).toBeInTheDocument();
  });

  it("produtos criados na sessão são excluídos sem chamar a API e voltam ao desfazer", async () => {
    const local = make(10_001, "Produto novo");
    const remove = vi.spyOn(productsService, "deleteProduct").mockResolvedValue();
    renderWithProviders(
      <>
        <SeedLocal product={local} />
        <AdminProducts />
      </>,
    );
    await screen.findByRole("link", { name: "Produto novo" });
    await userEvent.click(checkbox("Produto novo"));
    await userEvent.click(screen.getByRole("button", { name: "Excluir selecionados" }));
    await userEvent.click(await screen.findByRole("button", { name: "Excluir" }));

    await vi.waitFor(() =>
      expect(screen.queryByRole("link", { name: "Produto novo" })).not.toBeInTheDocument(),
    );
    expect(remove).not.toHaveBeenCalled();

    await userEvent.click(await screen.findByRole("button", { name: "Desfazer" }));
    expect(await screen.findByRole("link", { name: "Produto novo" })).toBeInTheDocument();
  });
});

describe("AdminProducts: edição de preço e estoque no lugar", () => {
  beforeEach(() => {
    localStorage.setItem(
      FX_KEY,
      JSON.stringify({ rate: 5, quotedAt: "2026-10-02T12:00:00.000Z", savedAt: Date.now() }),
    );
    vi.spyOn(productsService, "listCategories").mockResolvedValue([]);
    mockApi();
  });
  afterEach(() => vi.restoreAllMocks());

  const input = (name: RegExp) => screen.getByRole("textbox", { name });

  it("Enter salva o preço (com os demais campos), atualiza a tela e avisa", async () => {
    const update = vi.spyOn(productsService, "updateProduct").mockResolvedValue(make(1, "Batom"));
    renderWithProviders(<AdminProducts />);
    await screen.findByRole("table");

    await userEvent.click(screen.getByRole("button", { name: "Editar preço de Batom" }));
    const field = input(/Novo preço \(USD\) de Batom/);
    await userEvent.clear(field);
    await userEvent.type(field, "25.5{Enter}");

    await vi.waitFor(() =>
      expect(update).toHaveBeenCalledWith(1, {
        title: "Batom",
        description: "descrição",
        category: "beauty",
        price: 25.5,
        stock: 20,
      }),
    );
    expect(await screen.findByText("Preço atualizado (simulado)")).toBeInTheDocument();
    // voltou a exibir (em dólar até a cotação chegar) e sem o campo aberto
    expect(await within(rowOf("Batom")).findByText(/127,50/)).toBeInTheDocument(); // 25,50 × cotação 5
    expect(screen.queryByRole("textbox", { name: /Novo preço/ })).not.toBeInTheDocument();
  });

  it("edita o estoque e o botão Salvar funciona como Enter", async () => {
    const update = vi.spyOn(productsService, "updateProduct").mockResolvedValue(make(2, "Perfume"));
    renderWithProviders(<AdminProducts />);
    await screen.findByRole("table");

    await userEvent.click(screen.getByRole("button", { name: "Editar estoque de Perfume" }));
    const field = input(/Novo estoque de Perfume/);
    await userEvent.clear(field);
    await userEvent.type(field, "3");
    await userEvent.click(screen.getByRole("button", { name: "Salvar" }));

    await vi.waitFor(() =>
      expect(update).toHaveBeenCalledWith(2, expect.objectContaining({ stock: 3, price: 20 })),
    );
    expect(await screen.findByText("Estoque atualizado (simulado)")).toBeInTheDocument();
    expect(within(rowOf("Perfume")).getByText("3")).toBeInTheDocument();
  });

  it("Esc cancela sem chamar a API; valor igual ao atual também não chama", async () => {
    const update = vi.spyOn(productsService, "updateProduct").mockResolvedValue(make(1, "Batom"));
    renderWithProviders(<AdminProducts />);
    await screen.findByRole("table");

    await userEvent.click(screen.getByRole("button", { name: "Editar estoque de Batom" }));
    await userEvent.type(input(/Novo estoque de Batom/), "9{Escape}");
    expect(screen.queryByRole("textbox", { name: /Novo estoque/ })).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Editar estoque de Batom" }));
    await userEvent.type(input(/Novo estoque de Batom/), "{Enter}"); // continua 20
    expect(update).not.toHaveBeenCalled();
    expect(screen.queryByRole("textbox", { name: /Novo estoque/ })).not.toBeInTheDocument();
  });

  it.each([
    [
      "price",
      "Editar preço de Batom",
      /Novo preço \(USD\) de Batom/,
      "0",
      "O preço deve ser maior que zero",
    ],
    ["price", "Editar preço de Batom", /Novo preço \(USD\) de Batom/, "", "Informe o preço"],
    ["stock", "Editar estoque de Batom", /Novo estoque de Batom/, "", "Informe o estoque"],
  ])("valida (%s): %s", async (_field, open, name, typed, message) => {
    const update = vi.spyOn(productsService, "updateProduct").mockResolvedValue(make(1, "Batom"));
    renderWithProviders(<AdminProducts />);
    await screen.findByRole("table");
    await userEvent.click(screen.getByRole("button", { name: open }));
    const field = input(name);
    await userEvent.clear(field);
    if (typed) await userEvent.type(field, typed);
    await userEvent.keyboard("{Enter}");

    expect(await screen.findByText(message)).toBeInTheDocument();
    expect(update).not.toHaveBeenCalled();
    expect(input(name)).toBeInTheDocument(); // continua editando para corrigir
  });

  it("se a API falhar, o campo continua aberto e o valor não muda na tela", async () => {
    vi.spyOn(productsService, "updateProduct").mockRejectedValue(new Error("boom"));
    renderWithProviders(<AdminProducts />);
    await screen.findByRole("table");
    await userEvent.click(screen.getByRole("button", { name: "Editar estoque de Batom" }));
    const field = input(/Novo estoque de Batom/);
    await userEvent.clear(field);
    await userEvent.type(field, "7{Enter}");

    await vi.waitFor(() =>
      expect(
        screen.queryByRole("button", { name: "Editar estoque de Batom" }),
      ).not.toBeInTheDocument(),
    );
    expect(input(/Novo estoque de Batom/)).toBeInTheDocument();
    expect(screen.queryByText("Estoque atualizado (simulado)")).not.toBeInTheDocument();
  });

  it("produto criado na sessão é editado só no store (sem chamar a API)", async () => {
    const update = vi.spyOn(productsService, "updateProduct").mockResolvedValue(make(1, "Batom"));
    renderWithProviders(
      <>
        <SeedLocal product={make(10_001, "Produto novo")} />
        <AdminProducts />
      </>,
    );
    await screen.findByRole("link", { name: "Produto novo" });
    await userEvent.click(screen.getByRole("button", { name: "Editar estoque de Produto novo" }));
    const field = input(/Novo estoque de Produto novo/);
    await userEvent.clear(field);
    await userEvent.type(field, "4{Enter}");
    expect(await screen.findByText("Estoque atualizado (simulado)")).toBeInTheDocument();
    expect(update).not.toHaveBeenCalled();
    expect(within(rowOf("Produto novo")).getByText("4")).toBeInTheDocument();
  });
});

describe("AdminProducts: exportar CSV", () => {
  beforeEach(() => {
    vi.spyOn(productsService, "listCategories").mockResolvedValue([]);
  });
  afterEach(() => vi.restoreAllMocks());

  it("baixa o catálogo inteiro em português (; e vírgula decimal) com as alterações da sessão", async () => {
    mockApi([make(1, "Batom", { price: 10.5 }), make(2, "Perfume")]);
    const download = vi.spyOn(csv, "downloadTextFile").mockImplementation(() => {});
    renderWithProviders(
      <>
        <SeedLocal product={make(10_001, "Produto novo")} />
        <AdminProducts />
      </>,
    );
    await screen.findByRole("link", { name: "Produto novo" });
    await userEvent.click(screen.getByRole("button", { name: "Exportar CSV" }));

    expect(download).toHaveBeenCalledTimes(1);
    const [fileName, content] = download.mock.calls[0];
    expect(fileName).toMatch(/^produtos-\d{4}-\d{2}-\d{2}\.csv$/);
    const lines = content.slice(1).split("\r\n");
    expect(lines[0]).toBe(
      "Código;Título;Categoria;Marca;Preço de tabela (USD);Desconto (%);Preço final (USD);Estoque;Avaliação",
    );
    expect(lines.filter(Boolean)).toHaveLength(4); // cabeçalho + criado + 2 da API
    expect(lines.some((line) => line.startsWith("1;Batom;Beleza;Acme;10,5;"))).toBe(true);
    expect(lines.some((line) => line.includes("Produto novo"))).toBe(true);
    expect(
      await screen.findByText(/Arquivo produtos-.*\.csv baixado \(3 produtos\)\./),
    ).toBeInTheDocument();
  });

  it("em inglês usa vírgula e ponto decimal, com cabeçalhos em inglês", async () => {
    await i18n.changeLanguage("en");
    mockApi([make(1, "Batom", { price: 10.5 })]);
    const download = vi.spyOn(csv, "downloadTextFile").mockImplementation(() => {});
    renderWithProviders(<AdminProducts />);
    await screen.findByRole("table");
    await userEvent.click(screen.getByRole("button", { name: "Export CSV" }));
    const lines = download.mock.calls[0][1].slice(1).split("\r\n");
    expect(lines[0]).toBe(
      "Id,Title,Category,Brand,List price (USD),Discount (%),Final price (USD),Stock,Rating",
    );
    expect(lines[1]).toMatch(/^1,Batom,Beauty,Acme,10\.5,/);
  });

  it("não inclui produtos excluídos nesta sessão", async () => {
    mockApi([make(1, "Batom"), make(2, "Perfume")]);
    vi.spyOn(productsService, "deleteProduct").mockResolvedValue();
    const download = vi.spyOn(csv, "downloadTextFile").mockImplementation(() => {});
    renderWithProviders(<AdminProducts />);
    await screen.findByRole("table");
    await userEvent.click(screen.getByRole("button", { name: "Excluir Batom" }));
    await userEvent.click(await screen.findByRole("button", { name: "Excluir" }));
    await vi.waitFor(() =>
      expect(screen.queryByRole("link", { name: "Batom" })).not.toBeInTheDocument(),
    );

    await userEvent.click(screen.getByRole("button", { name: "Exportar CSV" }));
    const content = download.mock.calls[0][1];
    expect(content).toContain("Perfume");
    expect(content).not.toContain("Batom");
  });

  it("fica desabilitado enquanto o catálogo não carregou", () => {
    vi.spyOn(productsService, "listProducts").mockReturnValue(new Promise(() => {}));
    renderWithProviders(<AdminProducts />);
    expect(screen.getByRole("button", { name: "Exportar CSV" })).toBeDisabled();
  });
});

describe("notificações do admin", () => {
  it("a fila global de notificações é limpa entre os testes (sem avisos de testes anteriores)", () => {
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
});

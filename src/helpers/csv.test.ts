import type { Product } from "../schemas/product-schema";
import {
  CSV_BOM,
  csvFileName,
  csvNumber,
  csvText,
  downloadTextFile,
  productsToCsv,
  type CsvHeaders,
  type CsvOptions,
} from "./csv";

const comma: CsvOptions = { delimiter: ",", decimal: "." };
const semicolon: CsvOptions = { delimiter: ";", decimal: "," };

const headers: CsvHeaders = {
  id: "id",
  title: "title",
  category: "category",
  brand: "brand",
  price: "price",
  discount: "discount",
  finalPrice: "finalPrice",
  stock: "stock",
  rating: "rating",
};

const make = (overrides: Partial<Product> = {}): Product => ({
  id: 1,
  title: "Batom",
  description: "d",
  category: "beauty",
  price: 10.5,
  discountPercentage: 10,
  stock: 7,
  rating: 4.2,
  brand: "Acme",
  thumbnail: "t",
  images: [],
  ...overrides,
});

describe("csvText", () => {
  it("texto simples sai sem aspas", () => {
    expect(csvText("Batom", comma)).toBe("Batom");
  });

  it("coloca entre aspas quando há o delimitador do formato, e dobra aspas internas", () => {
    expect(csvText("Batom, vermelho", comma)).toBe('"Batom, vermelho"');
    expect(csvText("Batom, vermelho", semicolon)).toBe("Batom, vermelho"); // vírgula é comum em pt-BR com ;
    expect(csvText("a;b", semicolon)).toBe('"a;b"');
    expect(csvText('Ele disse "oi"', comma)).toBe('"Ele disse ""oi"""');
  });

  it("preserva quebras de linha dentro de aspas", () => {
    expect(csvText("linha 1\nlinha 2", comma)).toBe('"linha 1\nlinha 2"');
    expect(csvText("a\r\nb", comma)).toBe('"a\r\nb"');
  });

  it.each(["=SOMA(A1:A9)", "+1+1", "-2+3", "@cmd", "\t=x", "\r=x"])(
    "neutraliza possível fórmula (injeção de CSV): %j",
    (value) => {
      const cell = csvText(value, comma);
      expect(cell.replace(/^"/, "").startsWith("'")).toBe(true);
    },
  );

  it("vazio, nulo e indefinido viram célula vazia", () => {
    expect(csvText("", comma)).toBe("");
    expect(csvText(undefined, comma)).toBe("");
    expect(csvText(null, comma)).toBe("");
  });

  it("acentos e emoji passam intactos", () => {
    expect(csvText("Cafeteira Élite ☕", comma)).toBe("Cafeteira Élite ☕");
  });
});

describe("csvNumber", () => {
  it("usa o separador decimal do formato", () => {
    expect(csvNumber(10.5, comma)).toBe("10.5");
    expect(csvNumber(10.5, semicolon)).toBe("10,5");
    expect(csvNumber(0, comma)).toBe("0");
    expect(csvNumber(-3.25, semicolon)).toBe("-3,25"); // números não são "fórmulas"
  });

  it.each([undefined, null, NaN, Infinity])("%s vira célula vazia", (value) => {
    expect(csvNumber(value, comma)).toBe("");
  });
});

describe("productsToCsv", () => {
  const name = (slug: string) => (slug === "beauty" ? "Beleza" : slug);

  it("gera BOM, cabeçalho, linhas CRLF e termina com quebra de linha", () => {
    const csv = productsToCsv([make()], headers, comma, name);
    expect(csv.startsWith(CSV_BOM)).toBe(true);
    const lines = csv.slice(1).split("\r\n");
    expect(lines).toEqual([
      "id,title,category,brand,price,discount,finalPrice,stock,rating",
      "1,Batom,Beleza,Acme,10.5,10,9.45,7,4.2",
      "",
    ]);
  });

  it("formato pt-BR: ponto e vírgula e vírgula decimal", () => {
    const csv = productsToCsv([make()], headers, semicolon, name);
    expect(csv.split("\r\n")[1]).toBe("1;Batom;Beleza;Acme;10,5;10;9,45;7;4,2");
  });

  it("campos ausentes ficam vazios sem deslocar as colunas", () => {
    const csv = productsToCsv(
      [
        make({
          brand: undefined,
          stock: undefined,
          rating: undefined,
          discountPercentage: undefined,
        }),
      ],
      headers,
      comma,
      name,
    );
    expect(csv.split("\r\n")[1]).toBe("1,Batom,Beleza,,10.5,,10.5,,");
    expect(csv.split("\r\n")[1].split(",")).toHaveLength(9);
  });

  it("título malicioso é neutralizado e títulos com vírgula/aspas continuam em uma célula", () => {
    const csv = productsToCsv(
      [make({ title: '=HYPERLINK("http://x")' }), make({ id: 2, title: 'Mesa, "grande"' })],
      headers,
      comma,
      name,
    );
    const [, first, second] = csv.split("\r\n");
    expect(first.split(",")[1]).toBe(`"'=HYPERLINK(""http://x"")"`);
    expect(second).toContain('"Mesa, ""grande"""');
  });

  it("lista vazia gera só o cabeçalho", () => {
    const lines = productsToCsv([], headers, comma, name).slice(1).split("\r\n");
    expect(lines).toEqual(["id,title,category,brand,price,discount,finalPrice,stock,rating", ""]);
  });
});

describe("csvFileName", () => {
  it("usa a data local com zeros à esquerda", () => {
    expect(csvFileName(new Date(2026, 0, 5))).toBe("produtos-2026-01-05.csv");
    expect(csvFileName(new Date(2026, 9, 24))).toBe("produtos-2026-10-24.csv");
  });
});

describe("downloadTextFile", () => {
  it("cria um link temporário com o nome do arquivo, clica e libera a URL", () => {
    const create = vi.fn(() => "blob:fake");
    const revoke = vi.fn();
    Object.assign(URL, { createObjectURL: create, revokeObjectURL: revoke });
    const click = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});

    downloadTextFile("produtos.csv", "a,b");

    expect(create).toHaveBeenCalledTimes(1);
    expect(click).toHaveBeenCalledTimes(1);
    expect(revoke).toHaveBeenCalledWith("blob:fake");
    expect(document.querySelector("a[download]")).toBeNull(); // não deixa lixo no DOM
    click.mockRestore();
  });
});

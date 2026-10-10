import type { Product } from "../schemas/product-schema";
import { discountedPrice } from "./formatters";

export interface CsvOptions {
  /** `;` + decimal `,` é o padrão do Excel em português; `,` + `.` nos demais. */
  delimiter: "," | ";";
  decimal: "." | ",";
}

export const CSV_BOM = "﻿"; // faz o Excel reconhecer UTF-8 (acentos)

/** Texto que o Excel/Sheets interpretaria como fórmula (injeção de CSV). */
const FORMULA_START = /^[=+\-@\t\r]/;

/** Célula de texto: neutraliza fórmulas, e aplica aspas quando há delimitador, aspas ou quebra de linha. */
export function csvText(value: string | undefined | null, { delimiter }: CsvOptions): string {
  if (value === undefined || value === null || value === "") return "";
  const safe = FORMULA_START.test(value) ? `'${value}` : value;
  const needsQuotes = safe.includes(delimiter) || /["\r\n]/.test(safe);
  return needsQuotes ? `"${safe.replaceAll('"', '""')}"` : safe;
}

/** Célula numérica (sem aspas); aplica o separador decimal do formato. */
export function csvNumber(value: number | undefined | null, { decimal }: CsvOptions): string {
  if (value === undefined || value === null || !Number.isFinite(value)) return "";
  return String(value).replace(".", decimal);
}

export interface CsvHeaders {
  id: string;
  title: string;
  category: string;
  brand: string;
  price: string;
  discount: string;
  finalPrice: string;
  stock: string;
  rating: string;
}

/**
 * CSV do catálogo (UTF-8 com BOM, linhas CRLF). Preços em USD (a moeda dos dados); a categoria
 * sai com o nome já traduzido, via `categoryName`.
 */
export function productsToCsv(
  products: Product[],
  headers: CsvHeaders,
  options: CsvOptions,
  categoryName: (slug: string) => string,
): string {
  const text = (value: string | undefined | null) => csvText(value, options);
  const number = (value: number | undefined | null) => csvNumber(value, options);

  const head = [
    headers.id,
    headers.title,
    headers.category,
    headers.brand,
    headers.price,
    headers.discount,
    headers.finalPrice,
    headers.stock,
    headers.rating,
  ]
    .map(text)
    .join(options.delimiter);

  const lines = products.map((p) =>
    [
      number(p.id),
      text(p.title),
      text(categoryName(p.category)),
      text(p.brand),
      number(p.price),
      number(p.discountPercentage),
      number(discountedPrice(p.price, p.discountPercentage)),
      number(p.stock),
      number(p.rating),
    ].join(options.delimiter),
  );

  return CSV_BOM + [head, ...lines].join("\r\n") + "\r\n";
}

/** Nome do arquivo com a data local: `produtos-2026-10-04.csv`. */
export function csvFileName(date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `produtos-${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}.csv`;
}

/** Baixa o texto como arquivo (Blob + link temporário). */
export function downloadTextFile(
  fileName: string,
  content: string,
  mime = "text/csv;charset=utf-8",
) {
  const url = URL.createObjectURL(new Blob([content], { type: mime }));
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

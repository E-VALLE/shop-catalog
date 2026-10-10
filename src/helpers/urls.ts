/** Link para o catálogo já filtrado. Valores vazios são omitidos da URL. */
export function catalogUrl({
  category,
  brand,
}: {
  category?: string | null;
  brand?: string | null;
}): string {
  const params = new URLSearchParams();
  if (category) params.set("categoria", category);
  if (brand) params.set("marca", brand);
  const query = params.toString();
  return query ? `/produtos?${query}` : "/produtos";
}

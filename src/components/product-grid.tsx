import { SimpleGrid, Stack } from "@mantine/core";
import type { ViewMode } from "../helpers/view";
import type { Product } from "../schemas/product-schema";
import { ProductCard } from "./product-card";
import { ProductListItem } from "./product-list-item";

/** Lista de produtos em grade de cartões (padrão) ou em linhas detalhadas. */
export function ProductGrid({
  products,
  view = "grade",
}: {
  products: Product[];
  view?: ViewMode;
}) {
  if (view === "lista") {
    return (
      <Stack>
        {products.map((product) => (
          <ProductListItem key={product.id} product={product} />
        ))}
      </Stack>
    );
  }
  return (
    <SimpleGrid cols={{ base: 1, xs: 2, md: 3, lg: 4 }}>
      {products.map((product) => (
        <ProductCard key={product.id} product={product} />
      ))}
    </SimpleGrid>
  );
}

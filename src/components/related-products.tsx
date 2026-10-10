import { Stack, Title } from "@mantine/core";
import { useTranslation } from "react-i18next";
import { pickRelated } from "../helpers/related";
import { useApiQuery } from "../hooks/use-api-query";
import type { Product } from "../schemas/product-schema";
import { listProducts } from "../services/products-service";
import { ProductGrid } from "./product-grid";

export function RelatedProducts({ product }: { product: Product }) {
  const { t } = useTranslation();
  const query = useApiQuery(["products", { category: product.category, related: true }], (signal) =>
    listProducts({ category: product.category, limit: 0, signal }),
  );
  if (query.status !== "success") return null;

  const related = pickRelated(query.data.products, product);
  if (related.length === 0) return null;

  return (
    <Stack component="section" aria-labelledby="related-title">
      <Title order={2} id="related-title">
        {t("product.related")}
      </Title>
      <ProductGrid products={related} />
    </Stack>
  );
}

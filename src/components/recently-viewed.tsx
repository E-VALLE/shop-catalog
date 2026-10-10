import { Stack, Title } from "@mantine/core";
import { useTranslation } from "react-i18next";
import { useApiQuery } from "../hooks/use-api-query";
import { useRecentlyViewed } from "../hooks/use-recently-viewed";
import { listProducts } from "../services/products-service";
import { ProductGrid } from "./product-grid";

interface RecentlyViewedProps {
  /** Produto da página atual: não faz sentido recomendá-lo a si mesmo. */
  excludeId?: number;
  max?: number;
}

/** "Vistos recentemente": usa o catálogo em cache (mesma consulta do dashboard e dos favoritos). */
export function RecentlyViewed({ excludeId, max = 4 }: RecentlyViewedProps) {
  const { t } = useTranslation();
  const { ids } = useRecentlyViewed();
  const wanted = ids.filter((id) => id !== excludeId).slice(0, max);

  const catalog = useApiQuery(["products", "all"], (signal) => listProducts({ limit: 0, signal }), {
    enabled: wanted.length > 0,
  });
  if (wanted.length === 0 || catalog.status !== "success") return null;

  const products = wanted.flatMap((id) => catalog.data.products.find((p) => p.id === id) ?? []);
  if (products.length === 0) return null;

  return (
    <Stack component="section" aria-labelledby="recently-viewed-title">
      <Title order={2} id="recently-viewed-title">
        {t("home.recent")}
      </Title>
      <ProductGrid products={products} />
    </Stack>
  );
}

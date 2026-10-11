import { Button, Container, Stack, Text, Title } from "@mantine/core";
import { useTranslation } from "react-i18next";
import { Link } from "react-router";
import { ProductGrid } from "../components/product-grid";
import { ProductGridSkeleton } from "../components/product-skeleton";
import { EmptyState, ErrorState } from "../components/status-message";
import { useApiQuery } from "../hooks/use-api-query";
import { useDocumentTitle } from "../hooks/use-document-title";
import { useFavorites } from "../hooks/use-favorites";
import { listProducts } from "../services/products-service";

export function Favorites() {
  const { t } = useTranslation();
  const { ids, count } = useFavorites();
  useDocumentTitle(t("favorites.title"));

  // Mesma consulta (e cache) do dashboard: o catálogo completo tem ~200 itens.
  const catalog = useApiQuery(["products", "all"], (signal) => listProducts({ limit: 0, signal }), {
    enabled: count > 0,
  });

  // Mantém a ordem dos favoritos (mais recente primeiro); ids que a API não conhece são ignorados.
  const products =
    catalog.status === "success"
      ? ids.flatMap((id) => catalog.data.products.find((product) => product.id === id) ?? [])
      : [];

  return (
    <Container size="lg" py="xl">
      <Stack>
        <Stack gap="xs">
          <Title order={1}>{t("favorites.title")}</Title>
          <Text c="dimmed">{t("favorites.subtitle", { count })}</Text>
        </Stack>

        {(count === 0 || (catalog.status === "success" && products.length === 0)) && (
          <EmptyState title={t("favorites.empty")}>
            <Text size="sm" c="dimmed">
              {t("favorites.emptyHint")}
            </Text>
            <Button component={Link} to="/produtos">
              {t("cart.explore")}
            </Button>
          </EmptyState>
        )}
        {count > 0 && catalog.status === "loading" && (
          <ProductGridSkeleton count={Math.min(count, 8)} label={t("common.loading")} />
        )}
        {count > 0 && catalog.status === "error" && (
          <ErrorState message={catalog.error} onRetry={catalog.retry} />
        )}
        {catalog.status === "success" && products.length > 0 && <ProductGrid products={products} />}
      </Stack>
    </Container>
  );
}

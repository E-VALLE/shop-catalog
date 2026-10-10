import { Badge, Button, Card, Container, Group, Skeleton, Stack, Text, Title } from "@mantine/core";
import { IconArrowRight, IconSearch } from "@tabler/icons-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router";
import { HeroArt } from "../components/hero-art";
import { ProductGrid } from "../components/product-grid";
import { RecentlyViewed } from "../components/recently-viewed";
import { TrustStrip } from "../components/trust-strip";
import { ProductGridSkeleton } from "../components/product-skeleton";
import { ErrorState } from "../components/status-message";
import { formatCategory } from "../helpers/formatters";
import { useApiQuery } from "../hooks/use-api-query";
import { useCategories } from "../hooks/use-categories";
import { useDocumentTitle } from "../hooks/use-document-title";
import { listProducts, listTopDiscounts } from "../services/products-service";
import { HERO_GRADIENT } from "../theme/surfaces";

const COLLAPSED_CATEGORIES = 12;

export function Home() {
  const { t } = useTranslation();
  useDocumentTitle(t("nav.home"));
  const featured = useApiQuery(["products", { featured: 4 }], (signal) =>
    listProducts({ limit: 4, signal }),
  );
  const categories = useCategories();
  const promotions = useApiQuery(["products", { promo: 4 }], (signal) =>
    listTopDiscounts(4, signal),
  );
  const [showAll, setShowAll] = useState(false);
  const allCategories = categories.status === "success" ? categories.data : [];
  const visibleCategories = showAll ? allCategories : allCategories.slice(0, COLLAPSED_CATEGORIES);

  return (
    <Container size="lg" py="xl">
      <Stack gap="xl">
        <Card bg={HERO_GRADIENT}>
          <HeroArt />
          <Stack align="flex-start" pos="relative" style={{ zIndex: 1 }}>
            <Badge variant="light">{t("home.badge")}</Badge>
            <Title order={1}>{t("home.title")}</Title>
            <Text c="dimmed" maw={560}>
              {t("home.subtitle")}
            </Text>
            <Group>
              <Button component={Link} to="/produtos" rightSection={<IconArrowRight size={18} />}>
                {t("home.browse")}
              </Button>
              <Button
                component={Link}
                to="/produtos"
                variant="outline"
                leftSection={<IconSearch size={18} />}
              >
                {t("home.search")}
              </Button>
            </Group>
          </Stack>
        </Card>

        <TrustStrip />

        <Stack>
          <Title order={2}>{t("home.categories")}</Title>
          {categories.status === "loading" && (
            // Reserva o espaço das categorias para a página não "pular" quando elas chegam (CLS).
            <Group gap="xs" aria-hidden="true">
              {Array.from({ length: COLLAPSED_CATEGORIES + 1 }, (_, index) => (
                <Skeleton key={index} height={34} width={72 + ((index * 23) % 64)} radius="xl" />
              ))}
            </Group>
          )}
          {categories.status === "success" && (
            <Group gap="xs">
              {visibleCategories.map((category) => (
                <Badge
                  key={category.slug}
                  component={Link}
                  to={`/produtos?categoria=${encodeURIComponent(category.slug)}`}
                  variant="outline"
                  size="lg"
                  style={{ cursor: "pointer" }}
                >
                  {formatCategory(category.slug)}
                </Badge>
              ))}
              {allCategories.length > COLLAPSED_CATEGORIES && (
                <Button
                  variant="subtle"
                  size="compact-md"
                  aria-expanded={showAll}
                  onClick={() => setShowAll((current) => !current)}
                >
                  {showAll
                    ? t("home.showFewerCategories")
                    : t("home.showAllCategories", { count: allCategories.length })}
                </Button>
              )}
            </Group>
          )}
        </Stack>

        <Stack component="section" aria-labelledby="promotions-title">
          <Group justify="space-between">
            <Title order={2} id="promotions-title">
              {t("home.promotions")}
            </Title>
          </Group>
          {promotions.status === "loading" && (
            <ProductGridSkeleton count={4} label={t("common.loading")} />
          )}
          {promotions.status === "error" && <ErrorState message={promotions.error} />}
          {promotions.status === "success" && <ProductGrid products={promotions.data} />}
        </Stack>

        <Stack>
          <Group justify="space-between">
            <Title order={2}>{t("home.featured")}</Title>
            <Button component={Link} to="/produtos" variant="subtle">
              {t("home.seeAll")}
            </Button>
          </Group>
          {featured.status === "loading" && (
            <ProductGridSkeleton count={4} label={t("common.loading")} />
          )}
          {featured.status === "error" && <ErrorState message={featured.error} />}
          {featured.status === "success" && <ProductGrid products={featured.data.products} />}
        </Stack>
        <RecentlyViewed />
      </Stack>
    </Container>
  );
}

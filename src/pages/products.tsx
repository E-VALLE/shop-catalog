import {
  Badge,
  Button,
  CloseButton,
  Collapse,
  Container,
  Group,
  Pagination,
  Select,
  Stack,
  Text,
  TextInput,
  Title,
} from "@mantine/core";
import { IconAdjustmentsHorizontal, IconSearch } from "@tabler/icons-react";
import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { ProductFiltersPanel } from "../components/product-filters";
import { ViewToggle } from "../components/view-toggle";
import { ProductGridSkeleton } from "../components/product-skeleton";
import { EmptyState, ErrorState } from "../components/status-message";
import { ProductGrid } from "../components/product-grid";
import { categoryOptions, formatCategory } from "../helpers/formatters";
import { countActiveFilters, hasActiveFilters } from "../helpers/filters";
import { PUBLIC_SORT_KEYS } from "../helpers/sorting";
import { useCatalog } from "../hooks/use-catalog";
import { useDocumentTitle } from "../hooks/use-document-title";
import { useScrollOnChange } from "../hooks/use-scroll-on-change";

export function Products() {
  const { t } = useTranslation();
  const catalog = useCatalog();
  const { products } = catalog;
  const headingRef = useRef<HTMLHeadingElement>(null);
  const filterCount = countActiveFilters(catalog.filters);
  const [filtersOpen, setFiltersOpen] = useState(filterCount > 0);

  useDocumentTitle(
    catalog.category
      ? `${formatCategory(catalog.category)} · ${t("products.title")}`
      : t("products.title"),
  );
  useScrollOnChange(catalog.page, headingRef);

  return (
    <Container size="lg" py="xl">
      <Stack>
        <Stack gap="xs">
          <Title order={1} ref={headingRef} tabIndex={-1} style={{ outline: "none" }}>
            {t("products.title")}
          </Title>
          <Text c="dimmed">{t("products.subtitle")}</Text>
        </Stack>

        <Group align="flex-end" grow preventGrowOverflow={false}>
          <TextInput
            label={t("products.searchLabel")}
            placeholder={t("products.searchPlaceholder")}
            leftSection={<IconSearch size={18} />}
            type="search"
            value={catalog.searchInput}
            onChange={(event) => catalog.setSearchInput(event.currentTarget.value)}
          />
          <Select
            label={t("products.category")}
            placeholder={t("products.allCategories")}
            clearable
            searchable
            data={categoryOptions(catalog.categories)}
            value={catalog.category}
            onChange={catalog.setCategory}
          />
          <Select
            label={t("products.sortLabel")}
            placeholder={t("products.sortPlaceholder")}
            clearable
            data={PUBLIC_SORT_KEYS.map((key) => ({ value: key, label: t(`products.sort.${key}`) }))}
            value={catalog.sort}
            onChange={catalog.setSort}
          />
        </Group>

        <Group justify="space-between">
          <Button
            variant={filtersOpen || filterCount > 0 ? "light" : "default"}
            leftSection={<IconAdjustmentsHorizontal size={18} />}
            aria-expanded={filtersOpen}
            aria-controls="product-filters"
            onClick={() => setFiltersOpen((open) => !open)}
          >
            {filterCount > 0
              ? t("products.filters.toggleActive", { count: filterCount })
              : t("products.filters.toggle")}
          </Button>
          <ViewToggle value={catalog.view} onChange={catalog.setView} />
        </Group>
        <Collapse expanded={filtersOpen} id="product-filters">
          {filtersOpen && (
            <ProductFiltersPanel
              filters={catalog.filters}
              onChange={catalog.setFilters}
              onClear={catalog.clearFilters}
            />
          )}
        </Collapse>

        {catalog.brand && (
          <Group gap="xs">
            {/* Badge + CloseButton: o botão de remover do Pill é aria-hidden (feito para PillsInput). */}
            <Badge
              size="xl"
              variant="light"
              tt="none"
              rightSection={
                <CloseButton
                  size="sm"
                  aria-label={t("products.removeBrand", { brand: catalog.brand })}
                  onClick={catalog.clearBrand}
                />
              }
            >
              {t("products.brandFilter", { brand: catalog.brand })}
            </Badge>
          </Group>
        )}

        {products.status === "loading" && <ProductGridSkeleton label={t("products.loading")} />}
        {products.status === "error" && (
          <ErrorState message={products.error} onRetry={products.retry} />
        )}
        {products.status === "success" && products.data.products.length === 0 && (
          <EmptyState title={t("products.none")}>
            <Text size="sm" c="dimmed">
              {t("products.noneHint")}
            </Text>
            {hasActiveFilters(catalog.filters) && (
              <Button variant="light" onClick={catalog.clearFilters}>
                {t("products.filters.clear")}
              </Button>
            )}
            {catalog.brand && catalog.category && (
              <Button variant="light" onClick={catalog.clearCategory}>
                {t("products.allFromBrand", { brand: catalog.brand })}
              </Button>
            )}
          </EmptyState>
        )}
        {products.status === "success" && products.data.products.length > 0 && (
          <>
            <Text size="sm" c="dimmed" aria-live="polite">
              {t("products.found", { count: products.data.total })}
            </Text>
            <ProductGrid products={products.data.products} view={catalog.view} />
            {catalog.totalPages > 1 && (
              <Group justify="center">
                <Pagination
                  total={catalog.totalPages}
                  value={Math.min(catalog.page, catalog.totalPages)}
                  onChange={catalog.setPage}
                  getControlProps={(control) => ({ "aria-label": t(`pagination.${control}`) })}
                />
              </Group>
            )}
          </>
        )}
      </Stack>
    </Container>
  );
}

import { Button, Group, RangeSlider, Select, Stack, Switch, Text } from "@mantine/core";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  RATING_OPTIONS,
  SLIDER_STEPS,
  priceToSlider,
  sliderToPrice,
  hasActiveFilters,
  priceBounds,
  type ProductFilters,
} from "../helpers/filters";
import { useApiQuery } from "../hooks/use-api-query";
import { useFormatPrice } from "../hooks/use-format-price";
import { listProducts } from "../services/products-service";

interface ProductFiltersPanelProps {
  filters: ProductFilters;
  onChange: (changes: Partial<ProductFilters>) => void;
  onClear: () => void;
}

/** Faixa de preço, avaliação mínima e "só em estoque". O estado fica na URL (via `onChange`). */
export function ProductFiltersPanel({ filters, onChange, onClear }: ProductFiltersPanelProps) {
  const { t } = useTranslation();
  const formatPrice = useFormatPrice();

  // Limites reais do catálogo (mesma consulta/cache usada em dashboard, favoritos e comparação).
  const catalog = useApiQuery(["products", "all"], (signal) => listProducts({ limit: 0, signal }));
  const bounds = catalog.status === "success" ? priceBounds(catalog.data.products) : null;

  const from = filters.minPrice ?? bounds?.min ?? 0;
  const to = filters.maxPrice ?? bounds?.max ?? 0;
  // O slider guarda o valor enquanto arrasta; só ao soltar a URL é atualizada (evita uma consulta por pixel).
  // Trocar os filtros por fora (ex.: "limpar") remonta o slider por causa da `key`.
  const [dragging, setDragging] = useState<[number, number] | null>(null);
  const shown = dragging ?? [from, to];
  const sliderKey = `${filters.minPrice ?? ""}-${filters.maxPrice ?? ""}-${bounds?.min}-${bounds?.max}`;

  return (
    <Stack
      component="section"
      aria-label={t("products.filters.panel")}
      p="md"
      style={{
        border: "1px solid var(--mantine-color-default-border)",
        borderRadius: "var(--mantine-radius-lg)",
      }}
    >
      <Group align="flex-start" grow preventGrowOverflow={false}>
        <Stack gap="xs" miw={240}>
          <Text fw={600} size="sm" id="price-range-label">
            {t("products.filters.price")}
          </Text>
          {bounds ? (
            <>
              <RangeSlider
                key={sliderKey}
                min={0}
                max={SLIDER_STEPS}
                minRange={1}
                step={1}
                defaultValue={[priceToSlider(from, bounds), priceToSlider(to, bounds)]}
                onChange={([low, high]) =>
                  setDragging([sliderToPrice(low, bounds), sliderToPrice(high, bounds)])
                }
                onChangeEnd={([low, high]) => {
                  setDragging(null);
                  const min = sliderToPrice(low, bounds);
                  const max = sliderToPrice(high, bounds);
                  onChange({
                    minPrice: min <= bounds.min ? undefined : min,
                    maxPrice: max >= bounds.max ? undefined : max,
                  });
                }}
                label={(position) => formatPrice(sliderToPrice(position, bounds))}
                thumbFromLabel={t("products.filters.minHandle")}
                thumbToLabel={t("products.filters.maxHandle")}
                aria-labelledby="price-range-label"
              />
              <Text size="sm" c="dimmed" aria-live="polite">
                {t("products.filters.range", {
                  min: formatPrice(shown[0]),
                  max: formatPrice(shown[1]),
                })}
              </Text>
            </>
          ) : (
            <Text size="sm" c="dimmed">
              {t("common.loading")}
            </Text>
          )}
        </Stack>

        <Select
          label={t("products.filters.rating")}
          placeholder={t("products.filters.ratingAny")}
          clearable
          data={RATING_OPTIONS.map((value) => ({
            value: String(value),
            label: t("products.filters.ratingOption", { value }),
          }))}
          value={filters.minRating !== undefined ? String(filters.minRating) : null}
          onChange={(value) => onChange({ minRating: value ? Number(value) : undefined })}
        />

        <Switch
          mt={28}
          label={t("products.filters.inStock")}
          checked={filters.inStockOnly === true}
          onChange={(event) => onChange({ inStockOnly: event.currentTarget.checked || undefined })}
        />
      </Group>

      {hasActiveFilters(filters) && (
        <Group>
          <Button variant="subtle" size="compact-md" onClick={onClear}>
            {t("products.filters.clear")}
          </Button>
        </Group>
      )}
    </Stack>
  );
}

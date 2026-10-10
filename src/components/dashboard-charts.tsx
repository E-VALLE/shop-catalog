import "@mantine/charts/styles.css"; // só o Dashboard usa gráficos: o CSS vai no chunk dele
import { BarChart, DonutChart, LineChart } from "@mantine/charts";
import { z } from "zod";
import { Box, Card, Group, Stack, Text, Title, UnstyledButton } from "@mantine/core";
import { useTranslation } from "react-i18next";
import {
  averagePriceByCategory,
  countByCategory,
  stockBreakdown,
  type StockGroup,
} from "../helpers/dashboard-stats";
import { formatCategory } from "../helpers/formatters";
import { useFormatPrice } from "../hooks/use-format-price";
import type { Product } from "../schemas/product-schema";
import { PANEL_BG } from "../theme/surfaces";

const TOP_CATEGORIES = 10;

/** O Recharts entrega o item do gráfico em `payload` ao clicar numa barra. */
const barClickSchema = z.object({ payload: z.object({ category: z.string() }) });

/**
 * Os gráficos são SVG (invisíveis para leitores de tela); por isso cada um vem com um
 * `role="img"` descritivo e os mesmos números em texto/legenda, sem depender só de cor.
 */
export function CategoryChartCard({
  products,
  onSelectCategory,
}: {
  products: Product[];
  /** Chamado ao clicar em uma barra (mouse/toque); o teclado usa o painel "Categorias". */
  onSelectCategory: (category: string) => void;
}) {
  const { t } = useTranslation();
  const rows = countByCategory(products, TOP_CATEGORIES).map(({ category, count }) => ({
    category,
    name: formatCategory(category),
    count,
  }));
  // O número vai no próprio rótulo do eixo: as barras ficam legíveis sem depender do tooltip.
  const data = rows.map(({ name, count, category }) => ({
    label: `${name} · ${count}`,
    count,
    category,
  }));
  const summary = rows.map((row) => `${row.name}: ${row.count}`).join(", ");

  return (
    <Card component="section" aria-labelledby="chart-categories-title" bg={PANEL_BG}>
      <Title order={2} id="chart-categories-title">
        {t("dashboard.chartCategories", { count: TOP_CATEGORIES })}
      </Title>
      <Box
        role="img"
        aria-label={`${t("dashboard.chartCategories", { count: TOP_CATEGORIES })}. ${summary}`}
      >
        <BarChart
          h={Math.max(data.length, 3) * 34 + 24}
          data={data}
          dataKey="label"
          orientation="vertical"
          series={[{ name: "count", label: t("dashboard.products"), color: "blue.8" }]}
          yAxisProps={{ width: 200 }}
          gridAxis="x"
          withLegend={false}
          tickLine="none"
          barProps={{
            cursor: "pointer",
            onClick: (event: unknown) => {
              const clicked = barClickSchema.safeParse(event);
              if (clicked.success) onSelectCategory(clicked.data.payload.category);
            },
          }}
        />
      </Box>
    </Card>
  );
}

export function StockChartCard({
  products,
  onSelectGroup,
}: {
  products: Product[];
  onSelectGroup: (group: StockGroup) => void;
}) {
  const { t } = useTranslation();
  const stock = stockBreakdown(products);
  const rows: { group: StockGroup; name: string; value: number; color: string }[] = [
    { group: "in", name: t("dashboard.stockIn"), value: stock.inStock, color: "teal.8" },
    { group: "low", name: t("dashboard.stockLow"), value: stock.low, color: "orange.5" },
    { group: "out", name: t("dashboard.stockOut"), value: stock.out, color: "red.8" },
  ];
  const summary = rows.map((row) => `${row.name}: ${row.value}`).join(", ");

  return (
    <Card component="section" aria-labelledby="chart-stock-title" bg={PANEL_BG}>
      <Title order={2} id="chart-stock-title">
        {t("dashboard.chartStock")}
      </Title>
      <Group justify="center" gap="xl" align="center">
        <Box role="img" aria-label={`${t("dashboard.chartStock")}. ${summary}`}>
          <DonutChart
            data={rows}
            size={180}
            thickness={26}
            withTooltip
            chartLabel={String(products.length)}
            tooltipDataSource="segment"
          />
        </Box>
        {/* Legenda em texto: números visíveis e acessíveis, não só cores. */}
        <Stack gap="xs" component="ul" m={0} p={0} style={{ listStyle: "none" }}>
          {rows.map((row) => (
            <li key={row.name}>
              {/* Cada item abre a relação de produtos da situação (clique ou teclado). */}
              <UnstyledButton
                onClick={() => onSelectGroup(row.group)}
                aria-haspopup="dialog"
                aria-label={t("dashboard.drill.openStock", { name: row.name, count: row.value })}
              >
                <Group gap="xs" wrap="nowrap">
                  <Box w={12} h={12} bg={row.color} style={{ borderRadius: "50%" }} aria-hidden />
                  <Text size="sm" td="underline">
                    {row.name}: <b>{row.value}</b>
                  </Text>
                </Group>
              </UnstyledButton>
            </li>
          ))}
        </Stack>
      </Group>
    </Card>
  );
}

/**
 * Preço médio por categoria, em linha (categorias do mais barato ao mais caro). Os valores são
 * de tabela, em USD, convertidos para a moeda ativa.
 */
export function PriceChartCard({ products }: { products: Product[] }) {
  const { t } = useTranslation();
  const formatPrice = useFormatPrice();
  const rows = averagePriceByCategory(products).map(({ category, average }) => ({
    name: formatCategory(category),
    average,
  }));
  const summary = rows.map((row) => `${row.name}: ${formatPrice(row.average)}`).join(", ");

  return (
    <Card component="section" aria-labelledby="chart-price-title" bg={PANEL_BG}>
      <Title order={2} id="chart-price-title">
        {t("dashboard.chartPrice")}
      </Title>
      <Box role="img" aria-label={`${t("dashboard.chartPrice")}. ${summary}`}>
        <LineChart
          h={340}
          data={rows}
          dataKey="name"
          series={[{ name: "average", label: t("dashboard.averagePrice"), color: "blue.8" }]}
          curveType="monotone"
          withLegend={false}
          valueFormatter={(value) => formatPrice(value)}
          xAxisProps={{ angle: -40, textAnchor: "end", height: 110, interval: 0 }}
          yAxisProps={{ width: 80 }}
        />
      </Box>
    </Card>
  );
}

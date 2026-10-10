import { Button, Card, Container, Group, SimpleGrid, Stack, Text, Title } from "@mantine/core";
import {
  IconCategory,
  IconCurrencyDollar,
  IconPackage,
  IconPlus,
  IconAlertTriangle,
  IconChevronRight,
} from "@tabler/icons-react";
import type { Icon } from "@tabler/icons-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router";
import { CategoryChartCard, PriceChartCard, StockChartCard } from "../components/dashboard-charts";
import { DrillDownModal } from "../components/drill-down";
import { ErrorState, LoadingState } from "../components/status-message";
import { stockBreakdown, type DrillTarget } from "../helpers/dashboard-stats";
import { useFormatPrice } from "../hooks/use-format-price";
import { useAdminStore } from "../hooks/use-admin-store";
import { useApiQuery } from "../hooks/use-api-query";
import { useAuth } from "../hooks/use-auth";
import { useDocumentTitle } from "../hooks/use-document-title";
import { listProducts } from "../services/products-service";
import { PANEL_BG } from "../theme/surfaces";

interface MetricProps {
  label: string;
  value: string;
  icon: Icon;
  onOpen: () => void;
}

function Metric({ label, value, icon: IconComponent, onOpen }: MetricProps) {
  const { t } = useTranslation();
  return (
    // O painel inteiro é um botão: abre a relação de produtos por trás do número.
    <Card
      component="button"
      type="button"
      bg={PANEL_BG}
      onClick={onOpen}
      aria-haspopup="dialog"
      aria-label={`${label}: ${value}. ${t("dashboard.drill.open")}`}
      style={{
        cursor: "pointer",
        font: "inherit",
        color: "inherit",
        textAlign: "left",
        width: "100%",
      }}
    >
      <Group justify="space-between">
        <Text size="sm" c="dimmed" fw={500}>
          {label}
        </Text>
        <IconComponent size={20} />
      </Group>
      <Text size="xl" fw={700}>
        {value}
      </Text>
      <Group gap={4} c="dimmed">
        <Text size="xs">{t("dashboard.drill.open")}</Text>
        <IconChevronRight size={14} aria-hidden />
      </Group>
    </Card>
  );
}

export function Dashboard() {
  const { t } = useTranslation();
  useDocumentTitle(t("dashboard.title"));
  const formatPrice = useFormatPrice();
  const { user } = useAuth();
  const { created, applyTo } = useAdminStore();
  const state = useApiQuery(["products", "all"], (signal) => listProducts({ limit: 0, signal }));

  const products = state.status === "success" ? [...created, ...applyTo(state.data.products)] : [];
  const categories = new Set(products.map((p) => p.category)).size;
  const average = products.length
    ? products.reduce((sum, p) => sum + p.price, 0) / products.length
    : 0;
  const [drill, setDrill] = useState<DrillTarget | null>(null);
  const stock = stockBreakdown(products);
  const lowStock = stock.low + stock.out; // precisam de reposição (mesmo critério do gráfico)

  return (
    <Container size="lg" py="xl">
      <Stack>
        <Group justify="space-between">
          <Stack gap="xs">
            <Title order={1}>{t("dashboard.title")}</Title>
            <Text c="dimmed">{t("dashboard.hello", { name: user?.firstName })}</Text>
          </Stack>
          <Button component={Link} to="/admin/produtos/novo" leftSection={<IconPlus size={18} />}>
            {t("dashboard.newProduct")}
          </Button>
        </Group>

        {state.status === "loading" && <LoadingState />}
        {state.status === "error" && <ErrorState message={state.error} />}
        {state.status === "success" && (
          <SimpleGrid cols={{ base: 1, xs: 2, md: 4 }}>
            <Metric
              label={t("dashboard.products")}
              value={String(products.length)}
              icon={IconPackage}
              onOpen={() => setDrill({ kind: "all" })}
            />
            <Metric
              label={t("dashboard.categories")}
              value={String(categories)}
              icon={IconCategory}
              onOpen={() => setDrill({ kind: "categories" })}
            />
            <Metric
              label={t("dashboard.averagePrice")}
              value={formatPrice(average)}
              icon={IconCurrencyDollar}
              onOpen={() => setDrill({ kind: "prices" })}
            />
            <Metric
              label={t("dashboard.lowStock")}
              value={String(lowStock)}
              icon={IconAlertTriangle}
              onOpen={() => setDrill({ kind: "lowStock" })}
            />
          </SimpleGrid>
        )}

        {state.status === "success" && (
          <SimpleGrid cols={{ base: 1, md: 2 }}>
            <CategoryChartCard
              products={products}
              onSelectCategory={(category) => setDrill({ kind: "category", category })}
            />
            <StockChartCard
              products={products}
              onSelectGroup={(group) => setDrill({ kind: "stock", group })}
            />
          </SimpleGrid>
        )}

        {state.status === "success" && <PriceChartCard products={products} />}

        <Card bg={PANEL_BG}>
          <Title order={2}>{t("dashboard.quickActions")}</Title>
          <Group>
            <Button component={Link} to="/admin/produtos" variant="light">
              {t("dashboard.manage")}
            </Button>
            <Button component={Link} to="/produtos" variant="outline">
              {t("dashboard.viewStore")}
            </Button>
          </Group>
        </Card>
      </Stack>

      <DrillDownModal
        target={drill}
        products={products}
        onClose={() => setDrill(null)}
        onNavigate={setDrill}
      />
    </Container>
  );
}

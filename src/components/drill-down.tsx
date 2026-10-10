import {
  Anchor,
  Badge,
  Button,
  Group,
  Modal,
  Stack,
  Table,
  Text,
  Title,
  VisuallyHidden,
} from "@mantine/core";
import type { TFunction } from "i18next";
import { useTranslation } from "react-i18next";
import { Link } from "react-router";
import {
  countByCategory,
  lowStockProducts,
  priceExtremes,
  productsByStock,
  productsInCategory,
  type DrillTarget,
} from "../helpers/dashboard-stats";
import { formatCategory } from "../helpers/formatters";
import { stockStatus } from "../helpers/stock";
import { useFormatPrice } from "../hooks/use-format-price";
import type { Product } from "../schemas/product-schema";

/** Lista de produtos do drill-down: nome (link), categoria, preço, estoque e "Editar". */
export function ProductDrillTable({ products }: { products: Product[] }) {
  const { t } = useTranslation();
  const formatPrice = useFormatPrice();

  if (products.length === 0) {
    return (
      <Text c="dimmed" role="status">
        {t("dashboard.drill.empty")}
      </Text>
    );
  }

  return (
    <Stack gap="xs">
      <Text size="sm" c="dimmed" aria-live="polite">
        {t("dashboard.drill.count", { count: products.length })}
      </Text>
      <Table.ScrollContainer minWidth={520} mah="55vh" type="native">
        <Table verticalSpacing="xs" stickyHeader highlightOnHover>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>{t("admin.product")}</Table.Th>
              <Table.Th>{t("admin.category")}</Table.Th>
              <Table.Th ta="right">{t("admin.price")}</Table.Th>
              <Table.Th ta="right">{t("admin.stock")}</Table.Th>
              <Table.Th>
                <VisuallyHidden>{t("admin.actions")}</VisuallyHidden>
              </Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {products.map((product) => {
              const status = stockStatus(product.stock);
              return (
                <Table.Tr key={product.id}>
                  <Table.Td>
                    <Anchor component={Link} to={`/produtos/${product.id}`} c="inherit" fw={500}>
                      {product.title}
                    </Anchor>
                  </Table.Td>
                  <Table.Td>{formatCategory(product.category)}</Table.Td>
                  <Table.Td ta="right">{formatPrice(product.price)}</Table.Td>
                  <Table.Td ta="right">
                    {status === "out" ? (
                      <Badge color="gray.7">{t("product.outOfStock")}</Badge>
                    ) : status === "low" ? (
                      <Badge color="orange.4" c="dark.9">
                        {product.stock}
                      </Badge>
                    ) : (
                      (product.stock ?? "—")
                    )}
                  </Table.Td>
                  <Table.Td>
                    <Anchor
                      component={Link}
                      to={`/admin/produtos/${product.id}/editar`}
                      size="sm"
                      aria-label={t("admin.editAria", { title: product.title })}
                    >
                      {t("dashboard.drill.edit")}
                    </Anchor>
                  </Table.Td>
                </Table.Tr>
              );
            })}
          </Table.Tbody>
        </Table>
      </Table.ScrollContainer>
    </Stack>
  );
}

interface DrillDownModalProps {
  target: DrillTarget | null;
  products: Product[];
  onClose: () => void;
  /** Navegação interna do modal (ex.: de "Categorias" para os produtos de uma categoria). */
  onNavigate: (target: DrillTarget) => void;
}

function titleFor(target: DrillTarget, t: TFunction): string {
  switch (target.kind) {
    case "all":
      return t("dashboard.drill.all");
    case "categories":
      return t("dashboard.categories");
    case "prices":
      return t("dashboard.drill.prices");
    case "lowStock":
      return t("dashboard.drill.lowStock");
    case "stock":
      return t(`dashboard.drill.stock.${target.group}`);
    case "category":
      return t("dashboard.drill.category", { name: formatCategory(target.category) });
  }
}

/** Janela com a relação de produtos por trás de um painel ou de uma legenda do dashboard. */
export function DrillDownModal({ target, products, onClose, onNavigate }: DrillDownModalProps) {
  const { t } = useTranslation();
  const formatPrice = useFormatPrice();

  return (
    <Modal
      opened={target !== null}
      onClose={onClose}
      size="xl"
      title={
        <Title order={2} component="span" size="h3">
          {target ? titleFor(target, t) : ""}
        </Title>
      }
    >
      {target?.kind === "all" && (
        <ProductDrillTable
          products={[...products].sort((a, b) => a.title.localeCompare(b.title))}
        />
      )}

      {target?.kind === "lowStock" && <ProductDrillTable products={lowStockProducts(products)} />}

      {target?.kind === "stock" && (
        <ProductDrillTable products={productsByStock(products, target.group)} />
      )}

      {target?.kind === "category" && (
        <ProductDrillTable products={productsInCategory(products, target.category)} />
      )}

      {target?.kind === "categories" && (
        <Table.ScrollContainer minWidth={360} mah="55vh" type="native">
          <Table verticalSpacing="xs" stickyHeader highlightOnHover>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>{t("admin.category")}</Table.Th>
                <Table.Th ta="right">{t("dashboard.products")}</Table.Th>
                <Table.Th>
                  <VisuallyHidden>{t("admin.actions")}</VisuallyHidden>
                </Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {countByCategory(products).map(({ category, count }) => (
                <Table.Tr key={category}>
                  <Table.Td>{formatCategory(category)}</Table.Td>
                  <Table.Td ta="right">{count}</Table.Td>
                  <Table.Td ta="right">
                    <Button
                      variant="subtle"
                      size="compact-sm"
                      aria-label={t("dashboard.drill.seeCategory", {
                        name: formatCategory(category),
                      })}
                      onClick={() => onNavigate({ kind: "category", category })}
                    >
                      {t("dashboard.drill.seeProducts")}
                    </Button>
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        </Table.ScrollContainer>
      )}

      {target?.kind === "prices" && (
        <Stack>
          <Text size="sm" c="dimmed">
            {t("dashboard.drill.priceNote", { value: formatPrice(averagePrice(products)) })}
          </Text>
          <Title order={3} size="h4">
            {t("dashboard.drill.mostExpensive")}
          </Title>
          <ProductDrillTable products={priceExtremes(products).mostExpensive} />
          <Title order={3} size="h4">
            {t("dashboard.drill.cheapest")}
          </Title>
          <ProductDrillTable products={priceExtremes(products).cheapest} />
        </Stack>
      )}

      {target && target.kind !== "all" && target.kind !== "categories" && (
        <Group justify="flex-end" mt="md">
          <Button component={Link} to="/admin/produtos" variant="subtle">
            {t("dashboard.manage")}
          </Button>
        </Group>
      )}
    </Modal>
  );
}

function averagePrice(products: Product[]): number {
  return products.length ? products.reduce((sum, p) => sum + p.price, 0) / products.length : 0;
}

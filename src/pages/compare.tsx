import {
  Anchor,
  Badge,
  Button,
  Container,
  Group,
  Image,
  Stack,
  Table,
  Text,
  Title,
  VisuallyHidden,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { IconShoppingCartPlus, IconStarFilled, IconX } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router";
import { EmptyState, ErrorState, LoadingState } from "../components/status-message";
import { bestIds } from "../helpers/compare";
import { discountedPrice, formatCategory } from "../helpers/formatters";
import { discountPercent, stockStatus } from "../helpers/stock";
import { useApiQuery } from "../hooks/use-api-query";
import { useCart } from "../hooks/use-cart";
import { useCompare } from "../hooks/use-compare";
import { useDocumentTitle } from "../hooks/use-document-title";
import { useFormatPrice } from "../hooks/use-format-price";
import type { Product } from "../schemas/product-schema";
import { listProducts } from "../services/products-service";

const finalPriceOf = (product: Product) =>
  discountedPrice(product.price, product.discountPercentage);

export function Compare() {
  const { t } = useTranslation();
  useDocumentTitle(t("compare.title"));
  const formatPrice = useFormatPrice();
  const { ids, remove, clear } = useCompare();
  const { addItem } = useCart();

  const catalog = useApiQuery(["products", "all"], (signal) => listProducts({ limit: 0, signal }), {
    enabled: ids.length > 0,
  });

  const products =
    catalog.status === "success"
      ? ids.flatMap((id) => catalog.data.products.find((p) => p.id === id) ?? [])
      : [];

  const cheapest = bestIds(products, finalPriceOf, "min");
  const topRated = bestIds(products, (p) => p.rating, "max");
  const mostStock = bestIds(products, (p) => p.stock, "max");

  const empty = ids.length === 0 || (catalog.status === "success" && products.length === 0);

  return (
    <Container size="lg" py="xl">
      <Stack>
        <Group justify="space-between" align="flex-start">
          <Stack gap="xs">
            <Title order={1}>{t("compare.title")}</Title>
            <Text c="dimmed">{t("compare.subtitle")}</Text>
          </Stack>
          {products.length > 0 && (
            <Button variant="subtle" color="gray" onClick={clear}>
              {t("compare.clear")}
            </Button>
          )}
        </Group>

        {empty && (
          <EmptyState title={t("compare.empty")}>
            <Text size="sm" c="dimmed">
              {t("compare.emptyHint", { max: 3 })}
            </Text>
            <Button component={Link} to="/produtos">
              {t("cart.explore")}
            </Button>
          </EmptyState>
        )}
        {!empty && catalog.status === "loading" && <LoadingState />}
        {!empty && catalog.status === "error" && <ErrorState message={catalog.error} />}

        {products.length === 1 && (
          <Text role="status" c="dimmed">
            {t("compare.needTwo")}
          </Text>
        )}

        {products.length > 0 && (
          <Table.ScrollContainer minWidth={560}>
            <Table verticalSpacing="md" withColumnBorders aria-label={t("compare.title")}>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th scope="col">
                    <VisuallyHidden>{t("compare.attribute")}</VisuallyHidden>
                  </Table.Th>
                  {products.map((product) => (
                    <Table.Th
                      key={product.id}
                      scope="col"
                      miw={170}
                      style={{ verticalAlign: "top" }}
                    >
                      <Stack align="center" gap="xs">
                        <Image
                          src={product.thumbnail}
                          alt=""
                          w={96}
                          h={96}
                          fit="contain"
                          loading="lazy"
                        />
                        <Anchor
                          component={Link}
                          to={`/produtos/${product.id}`}
                          fw={700}
                          ta="center"
                        >
                          {product.title}
                        </Anchor>
                        <Button
                          variant="subtle"
                          color="gray"
                          size="compact-sm"
                          leftSection={<IconX size={14} />}
                          aria-label={t("compare.remove", { title: product.title })}
                          onClick={() => remove(product.id)}
                        >
                          {t("compare.removeShort")}
                        </Button>
                      </Stack>
                    </Table.Th>
                  ))}
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                <Row label={t("compare.category")}>
                  {products.map((p) => (
                    <Table.Td key={p.id} ta="center">
                      {formatCategory(p.category)}
                    </Table.Td>
                  ))}
                </Row>
                <Row label={t("compare.brand")}>
                  {products.map((p) => (
                    <Table.Td key={p.id} ta="center">
                      {p.brand ?? "—"}
                    </Table.Td>
                  ))}
                </Row>
                <Row label={t("compare.price")}>
                  {products.map((p) => (
                    <Table.Td key={p.id} ta="center">
                      <Stack gap={4} align="center">
                        <Text fw={700}>{formatPrice(finalPriceOf(p))}</Text>
                        {discountPercent(p.discountPercentage) > 0 && (
                          <Text size="sm" c="dimmed" td="line-through">
                            {formatPrice(p.price)}
                          </Text>
                        )}
                        {cheapest.has(p.id) && (
                          <Badge color="teal.9">{t("compare.cheapest")}</Badge>
                        )}
                      </Stack>
                    </Table.Td>
                  ))}
                </Row>
                <Row label={t("compare.discount")}>
                  {products.map((p) => (
                    <Table.Td key={p.id} ta="center">
                      {discountPercent(p.discountPercentage) > 0
                        ? `-${discountPercent(p.discountPercentage)}%`
                        : "—"}
                    </Table.Td>
                  ))}
                </Row>
                <Row label={t("compare.rating")}>
                  {products.map((p) => (
                    <Table.Td key={p.id} ta="center">
                      <Stack gap={4} align="center">
                        {p.rating !== undefined ? (
                          <Group gap={4}>
                            <IconStarFilled size={14} aria-hidden />
                            <Text>{p.rating.toFixed(1)}</Text>
                          </Group>
                        ) : (
                          "—"
                        )}
                        {topRated.has(p.id) && (
                          <Badge color="teal.9">{t("compare.topRated")}</Badge>
                        )}
                      </Stack>
                    </Table.Td>
                  ))}
                </Row>
                <Row label={t("compare.stock")}>
                  {products.map((p) => {
                    const status = stockStatus(p.stock);
                    return (
                      <Table.Td key={p.id} ta="center">
                        <Stack gap={4} align="center">
                          <Text>
                            {status === "out"
                              ? t("product.outOfStock")
                              : p.stock === undefined
                                ? "—"
                                : t("product.inStock", { count: p.stock })}
                          </Text>
                          {mostStock.has(p.id) && p.stock !== undefined && p.stock > 0 && (
                            <Badge color="teal.9">{t("compare.mostStock")}</Badge>
                          )}
                        </Stack>
                      </Table.Td>
                    );
                  })}
                </Row>
                <Row label={t("compare.buy")}>
                  {products.map((p) => (
                    <Table.Td key={p.id} ta="center">
                      <Button
                        size="sm"
                        variant="light"
                        leftSection={<IconShoppingCartPlus size={16} />}
                        disabled={stockStatus(p.stock) === "out"}
                        aria-label={t("product.buyAria", { title: p.title })}
                        onClick={() => {
                          addItem(p);
                          notifications.show({
                            title: t("product.added"),
                            message: p.title,
                            color: "green",
                          });
                        }}
                      >
                        {t("product.buy")}
                      </Button>
                    </Table.Td>
                  ))}
                </Row>
              </Table.Tbody>
            </Table>
          </Table.ScrollContainer>
        )}
      </Stack>
    </Container>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <Table.Tr>
      <Table.Th scope="row" miw={120}>
        {label}
      </Table.Th>
      {children}
    </Table.Tr>
  );
}

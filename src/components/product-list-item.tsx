import { Anchor, Badge, Box, Button, Card, Flex, Group, Image, Stack, Text } from "@mantine/core";
import { IconStarFilled } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router";
import { discountedPrice, formatCategory } from "../helpers/formatters";
import { discountPercent, stockStatus } from "../helpers/stock";
import { catalogUrl } from "../helpers/urls";
import { useFormatPrice } from "../hooks/use-format-price";
import type { Product } from "../schemas/product-schema";
import { CardCartControl } from "./card-cart-control";
import { CompareButton } from "./compare-button";
import { FavoriteButton } from "./favorite-button";

/** Versão em linha do `ProductCard`: foto, descrição e ações lado a lado (lista detalhada). */
export function ProductListItem({ product }: { product: Product }) {
  const { t } = useTranslation();
  const formatPrice = useFormatPrice();
  const finalPrice = discountedPrice(product.price, product.discountPercentage);
  const discount = discountPercent(product.discountPercentage);
  const status = stockStatus(product.stock);

  return (
    <Card component="article" aria-label={product.title}>
      <Flex
        direction={{ base: "column", sm: "row" }}
        gap="lg"
        align={{ base: "stretch", sm: "center" }}
      >
        {/* Atalho para os detalhes; o título é o link acessível (sem duplicar o foco). */}
        <Anchor
          component={Link}
          to={`/produtos/${product.id}`}
          tabIndex={-1}
          aria-hidden
          w={{ base: "100%", sm: 168 }}
          style={{ flexShrink: 0 }}
        >
          <Box
            bg="var(--mantine-color-default-hover)"
            style={{ borderRadius: "var(--mantine-radius-md)" }}
          >
            <Image
              src={product.thumbnail}
              alt=""
              h={140}
              fit="contain"
              loading="lazy"
              decoding="async"
            />
          </Box>
        </Anchor>

        <Stack gap="xs" flex={1} miw={0}>
          <Group gap="xs">
            <Badge
              variant="light"
              component={Link}
              to={catalogUrl({ category: product.category })}
              aria-label={t("product.viewCategory", { category: formatCategory(product.category) })}
              style={{ cursor: "pointer" }}
            >
              {formatCategory(product.category)}
            </Badge>
            {product.brand && <Badge variant="outline">{product.brand}</Badge>}
            {product.rating !== undefined && (
              <Group gap={4} wrap="nowrap">
                <IconStarFilled size={14} aria-hidden />
                <Text size="sm" fw={500}>
                  {product.rating.toFixed(1)}
                </Text>
              </Group>
            )}
          </Group>
          <Text component="h2" fw={700} size="lg" lineClamp={2}>
            <Anchor component={Link} to={`/produtos/${product.id}`} c="inherit" underline="hover">
              {product.title}
            </Anchor>
          </Text>
          <Text size="sm" c="dimmed" lineClamp={2}>
            {product.description}
          </Text>
          {status === "low" && (
            <Text
              size="sm"
              fw={600}
              c="light-dark(var(--mantine-color-red-9), var(--mantine-color-red-4))"
            >
              {t("product.lowStockDetail", { count: product.stock })}
            </Text>
          )}
          {status === "out" && (
            <Text
              size="sm"
              fw={600}
              c="light-dark(var(--mantine-color-red-9), var(--mantine-color-red-4))"
            >
              {t("product.outOfStock")}
            </Text>
          )}
        </Stack>

        <Flex
          direction="column"
          gap="xs"
          align={{ base: "stretch", sm: "flex-end" }}
          miw={{ sm: 190 }}
        >
          <Flex
            gap="xs"
            align="baseline"
            wrap="wrap"
            justify={{ base: "flex-start", sm: "flex-end" }}
          >
            <Text fw={700} size="xl">
              {formatPrice(finalPrice)}
            </Text>
            {finalPrice < product.price && (
              <Text size="sm" c="dimmed" td="line-through">
                {formatPrice(product.price)}
              </Text>
            )}
            {discount > 0 && (
              <Badge color="red.8" aria-label={t("product.discountAria", { percent: discount })}>
                -{discount}%
              </Badge>
            )}
          </Flex>
          <Group gap="xs" wrap="nowrap">
            <Button component={Link} to={`/produtos/${product.id}`} variant="light" size="sm">
              {t("product.details")}
            </Button>
            <CardCartControl product={product} />
            <CompareButton product={product} variant="default" />
            <FavoriteButton product={product} variant="default" />
          </Group>
        </Flex>
      </Flex>
    </Card>
  );
}

import { Badge, Button, Card, Group, Image, Text } from "@mantine/core";
import { IconStarFilled } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router";
import { discountedPrice, formatCategory } from "../helpers/formatters";
import { catalogUrl } from "../helpers/urls";
import { CardCartControl } from "./card-cart-control";
import { CompareButton } from "./compare-button";
import { FavoriteButton } from "./favorite-button";
import { discountPercent, stockStatus } from "../helpers/stock";
import { useFormatPrice } from "../hooks/use-format-price";
import type { Product } from "../schemas/product-schema";

interface ProductCardProps {
  product: Product;
}

export function ProductCard({ product }: ProductCardProps) {
  const { t } = useTranslation();
  const formatPrice = useFormatPrice();
  const finalPrice = discountedPrice(product.price, product.discountPercentage);
  const hasDiscount = finalPrice < product.price;
  const discount = discountPercent(product.discountPercentage);
  const status = stockStatus(product.stock);

  return (
    <Card component="article" aria-label={product.title}>
      {/* Atalho com o mesmo destino do botão "Detalhes". Fora da ordem de tabulação e do
          leitor de tela para não duplicar o link "Detalhes" (que é o alvo acessível). */}
      <Card.Section
        component={Link}
        to={`/produtos/${product.id}`}
        tabIndex={-1}
        aria-hidden
        bg="var(--mantine-color-default-hover)"
      >
        <Image
          src={product.thumbnail}
          alt=""
          h={180}
          fit="contain"
          loading="lazy"
          decoding="async"
        />
      </Card.Section>

      {/* Selos sobre a imagem; não capturam cliques (a imagem é o atalho para os detalhes). */}
      <CompareButton
        product={product}
        pos="absolute"
        top={140}
        left={10}
        size="md"
        style={{ boxShadow: "var(--mantine-shadow-sm)" }}
      />
      <FavoriteButton
        product={product}
        pos="absolute"
        top={140}
        right={10}
        size="md"
        style={{ boxShadow: "var(--mantine-shadow-sm)" }}
      />

      <Group
        pos="absolute"
        top={10}
        left={10}
        right={10}
        justify="space-between"
        wrap="nowrap"
        gap="xs"
        style={{ pointerEvents: "none" }}
      >
        {discount > 0 ? (
          <Badge color="red.8" aria-label={t("product.discountAria", { percent: discount })}>
            -{discount}%
          </Badge>
        ) : (
          <span />
        )}
        {status === "low" && (
          <Badge color="orange.4" c="dark.9" variant="filled">
            {t("product.lowStock", { count: product.stock })}
          </Badge>
        )}
        {status === "out" && (
          <Badge color="gray.7" variant="filled">
            {t("product.outOfStock")}
          </Badge>
        )}
      </Group>

      <Group justify="space-between" align="flex-start" wrap="nowrap" gap="xs">
        <Badge
          variant="light"
          component={Link}
          to={catalogUrl({ category: product.category })}
          aria-label={t("product.viewCategory", { category: formatCategory(product.category) })}
          style={{ cursor: "pointer" }}
        >
          {formatCategory(product.category)}
        </Badge>
        {product.rating !== undefined && (
          <Group gap={4} wrap="nowrap">
            <IconStarFilled size={14} />
            <Text size="sm" fw={500}>
              {product.rating.toFixed(1)}
            </Text>
          </Group>
        )}
      </Group>

      <Text component="h2" fw={700} size="md" lineClamp={2} mih={48}>
        {product.title}
      </Text>

      <Group gap="xs" align="baseline">
        <Text fw={700} size="lg">
          {formatPrice(finalPrice)}
        </Text>
        {hasDiscount && (
          <Text size="sm" c="dimmed" td="line-through">
            {formatPrice(product.price)}
          </Text>
        )}
      </Group>

      {/* size="sm" (exceção ao md do tema): em grids de 4 colunas o rótulo era cortado. */}
      <Group grow gap="xs" wrap="nowrap">
        <Button component={Link} to={`/produtos/${product.id}`} variant="light" size="sm" px={4}>
          {t("product.details")}
        </Button>
        <CardCartControl product={product} />
      </Group>
    </Card>
  );
}

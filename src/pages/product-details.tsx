import {
  Anchor,
  useComputedColorScheme,
  Badge,
  Breadcrumbs,
  Button,
  Container,
  Group,
  NumberInput,
  SimpleGrid,
  Spoiler,
  Stack,
  Text,
  Title,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { IconArrowLeft, IconShoppingCartPlus, IconStarFilled } from "@tabler/icons-react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useNavigate } from "react-router";
import { ProductDetailsSkeleton } from "../components/product-skeleton";
import { FavoriteButton } from "../components/favorite-button";
import { ProductGallery } from "../components/product-gallery";
import { ProductReviews } from "../components/product-reviews";
import { RelatedProducts } from "../components/related-products";
import { RecentlyViewed } from "../components/recently-viewed";
import { ErrorState } from "../components/status-message";
import { discountedPrice, formatCategory } from "../helpers/formatters";
import { catalogUrl } from "../helpers/urls";
import { discountPercent, stockStatus } from "../helpers/stock";
import { useDocumentTitle } from "../hooks/use-document-title";
import { useFormatPrice } from "../hooks/use-format-price";
import { useCart } from "../hooks/use-cart";
import { useProductDetails } from "../hooks/use-product-details";
import { useRecentlyViewed } from "../hooks/use-recently-viewed";

export function ProductDetails() {
  const { t } = useTranslation();
  const formatPrice = useFormatPrice();
  const { state } = useProductDetails();
  const { record } = useRecentlyViewed();
  const viewedId = state.status === "success" ? state.data.id : null;
  useEffect(() => {
    if (viewedId !== null) record(viewedId);
  }, [viewedId, record]);
  const scheme = useComputedColorScheme("light");
  useDocumentTitle(state.status === "success" ? state.data.title : null);
  const { addItem } = useCart();
  const navigate = useNavigate();
  const [quantity, setQuantity] = useState<number | string>(1);

  return (
    <Container size="lg" py="xl">
      <Stack>
        <Group>
          <Button
            variant="subtle"
            leftSection={<IconArrowLeft size={18} />}
            onClick={() => navigate(-1)}
          >
            {t("common.back")}
          </Button>
        </Group>

        {state.status === "loading" && <ProductDetailsSkeleton label={t("product.loading")} />}
        {state.status === "error" && <ErrorState message={state.error} />}
        {state.status === "success" &&
          (() => {
            const product = state.data;
            const finalPrice = discountedPrice(product.price, product.discountPercentage);
            const discount = discountPercent(product.discountPercentage);
            const status = stockStatus(product.stock);
            const qty = typeof quantity === "number" && quantity >= 1 ? quantity : 1;

            const handleAdd = () => {
              addItem(product, qty);
              notifications.show({
                title: t("product.added"),
                message: t("product.addedMessage", { quantity: qty, title: product.title }),
                color: "green",
              });
            };

            return (
              <>
                <Breadcrumbs component="nav" aria-label={t("nav.breadcrumb")}>
                  <Anchor component={Link} to="/produtos" size="sm">
                    {t("nav.products")}
                  </Anchor>
                  <Anchor
                    component={Link}
                    to={catalogUrl({ category: product.category })}
                    size="sm"
                  >
                    {formatCategory(product.category)}
                  </Anchor>
                  <Text size="sm" c="dimmed" aria-current="page" lineClamp={1}>
                    {product.title}
                  </Text>
                </Breadcrumbs>
                <SimpleGrid cols={{ base: 1, md: 2 }}>
                  <ProductGallery
                    key={product.id}
                    title={product.title}
                    thumbnail={product.thumbnail}
                    images={product.images}
                  />
                  <Stack>
                    <Group>
                      <Badge
                        variant="light"
                        component={Link}
                        to={catalogUrl({ category: product.category })}
                        aria-label={t("product.viewCategory", {
                          category: formatCategory(product.category),
                        })}
                        style={{ cursor: "pointer" }}
                      >
                        {formatCategory(product.category)}
                      </Badge>
                      {product.brand && (
                        <Badge
                          variant="outline"
                          component={Link}
                          to={catalogUrl({ category: product.category, brand: product.brand })}
                          aria-label={t("product.viewBrand", {
                            brand: product.brand,
                            category: formatCategory(product.category),
                          })}
                          style={{ cursor: "pointer" }}
                        >
                          {product.brand}
                        </Badge>
                      )}
                    </Group>
                    <Group justify="space-between" align="flex-start" wrap="nowrap">
                      <Title order={1}>{product.title}</Title>
                      <FavoriteButton product={product} size="xl" variant="light" iconSize={22} />
                    </Group>
                    {product.rating !== undefined && (
                      <Group gap={4}>
                        <IconStarFilled size={16} />
                        <Text fw={500}>{product.rating.toFixed(1)}</Text>
                        <Text size="sm" c="dimmed">
                          {t("reviews.overall")}
                        </Text>
                      </Group>
                    )}
                    <Group align="baseline" gap="xs">
                      <Text fw={700} size="xl">
                        {formatPrice(finalPrice)}
                      </Text>
                      {finalPrice < product.price && (
                        <Text c="dimmed" td="line-through">
                          {formatPrice(product.price)}
                        </Text>
                      )}
                      {discount > 0 && (
                        <Badge
                          color="red.8"
                          size="lg"
                          aria-label={t("product.discountAria", { percent: discount })}
                        >
                          -{discount}%
                        </Badge>
                      )}
                    </Group>
                    <Spoiler
                      maxHeight={96}
                      showLabel={t("product.readMore")}
                      hideLabel={t("product.readLess")}
                    >
                      <Text>{product.description}</Text>
                    </Spoiler>
                    {status !== "unknown" && (
                      <Text
                        size="sm"
                        fw={status === "in" ? 400 : 600}
                        c={status === "in" ? "dimmed" : scheme === "dark" ? "red.4" : "red.8"}
                      >
                        {status === "out"
                          ? t("product.outOfStock")
                          : status === "low"
                            ? t("product.lowStockDetail", { count: product.stock })
                            : t("product.inStock", { count: product.stock })}
                      </Text>
                    )}
                    <Group align="flex-end">
                      <NumberInput
                        label={t("product.quantity")}
                        min={1}
                        max={product.stock || undefined}
                        allowDecimal={false}
                        allowNegative={false}
                        clampBehavior="strict"
                        value={quantity}
                        onChange={setQuantity}
                        w={120}
                      />
                      <Button
                        leftSection={<IconShoppingCartPlus size={18} />}
                        onClick={handleAdd}
                        disabled={status === "out"}
                      >
                        {t("product.addToCart")}
                      </Button>
                    </Group>
                    <Button component={Link} to="/carrinho" variant="light">
                      {t("product.goToCart")}
                    </Button>
                  </Stack>
                </SimpleGrid>
              </>
            );
          })()}
        {state.status === "success" && (
          <>
            <ProductReviews reviews={state.data.reviews ?? []} />
            <RelatedProducts product={state.data} />
          </>
        )}
        {viewedId !== null && <RecentlyViewed excludeId={viewedId} />}
      </Stack>
    </Container>
  );
}

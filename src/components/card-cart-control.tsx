import { ActionIcon, Button, Group, Text } from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { IconMinus, IconPlus, IconShoppingCartPlus } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";
import { stockStatus } from "../helpers/stock";
import { useCart } from "../hooks/use-cart";
import { useCartUndo } from "../hooks/use-cart-undo";
import type { Product } from "../schemas/product-schema";

/**
 * "Comprar" enquanto o produto não está no carrinho; depois vira um seletor − N + (limitado ao
 * estoque). Diminuir de 1 remove o item, com "Desfazer", como no carrinho.
 */
export function CardCartControl({ product }: { product: Product }) {
  const { t } = useTranslation();
  const { items, addItem, setQuantity } = useCart();
  const { removeWithUndo } = useCartUndo();
  const inCart = items.find((item) => item.id === product.id);
  const soldOut = stockStatus(product.stock) === "out";

  if (!inCart) {
    return (
      <Button
        variant="outline"
        size="sm"
        px={4}
        leftSection={<IconShoppingCartPlus size={15} />}
        disabled={soldOut}
        aria-label={t("product.buyAria", { title: product.title })}
        onClick={() => {
          addItem(product);
          notifications.show({ title: t("product.added"), message: product.title, color: "green" });
        }}
      >
        {t("product.buy")}
      </Button>
    );
  }

  const atMax = product.stock !== undefined && inCart.quantity >= product.stock;

  return (
    <Group
      justify="space-between"
      wrap="nowrap"
      gap={4}
      role="group"
      aria-label={t("cart.quantityAria", { title: product.title })}
    >
      <ActionIcon
        variant="light"
        size="lg"
        aria-label={t("product.decrease", { title: product.title })}
        onClick={() =>
          inCart.quantity <= 1
            ? removeWithUndo(product.id)
            : setQuantity(product.id, inCart.quantity - 1)
        }
      >
        <IconMinus size={16} />
      </ActionIcon>
      <Text fw={700} aria-live="polite" miw={20} ta="center">
        {inCart.quantity}
      </Text>
      <ActionIcon
        variant="light"
        size="lg"
        disabled={atMax}
        title={atMax ? t("product.maxStock") : undefined}
        aria-label={t("product.increase", { title: product.title })}
        onClick={() => setQuantity(product.id, inCart.quantity + 1)}
      >
        <IconPlus size={16} />
      </ActionIcon>
    </Group>
  );
}

import {
  ActionIcon,
  Anchor,
  Button,
  Card,
  Container,
  Group,
  Image,
  NumberInput,
  Stack,
  Text,
  Title,
} from "@mantine/core";
import { IconTrash } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router";
import { OrderSummary } from "../components/order-summary";
import { EmptyState } from "../components/status-message";
import { useCart } from "../hooks/use-cart";
import { useCartUndo } from "../hooks/use-cart-undo";
import { useCheckout } from "../hooks/use-checkout";
import { useDocumentTitle } from "../hooks/use-document-title";
import { useFormatPrice } from "../hooks/use-format-price";

export function Cart() {
  const { t } = useTranslation();
  useDocumentTitle(t("cart.title"));
  const formatPrice = useFormatPrice();
  const { items, setQuantity } = useCart();
  const { removeWithUndo, clearWithUndo } = useCartUndo();
  const { startCheckout } = useCheckout();

  return (
    <Container size="lg" py="xl">
      <Stack>
        <Title order={1}>{t("cart.title")}</Title>

        {items.length === 0 ? (
          <EmptyState title={t("cart.empty")}>
            <Button component={Link} to="/produtos">
              {t("cart.explore")}
            </Button>
          </EmptyState>
        ) : (
          <>
            {items.map((item) => (
              <Card key={item.id} component="article" aria-label={item.title}>
                {/* Em telas estreitas o bloco de quantidade/total/remover quebra para a linha de baixo. */}
                <Group justify="space-between" align="center">
                  <Group wrap="nowrap" flex="1 1 240px" miw={0}>
                    {/* Atalho para os detalhes; o título abaixo é o link acessível (sem duplicar o foco). */}
                    <Anchor component={Link} to={`/produtos/${item.id}`} tabIndex={-1} aria-hidden>
                      <Image src={item.thumbnail} alt="" w={72} h={72} fit="contain" />
                    </Anchor>
                    <Stack gap={2} flex={1} miw={0}>
                      <Anchor
                        component={Link}
                        to={`/produtos/${item.id}`}
                        fw={700}
                        c="inherit"
                        lineClamp={2}
                      >
                        {item.title}
                      </Anchor>
                      <Text size="sm" c="dimmed">
                        {t("cart.each", { price: formatPrice(item.price) })}
                      </Text>
                    </Stack>
                  </Group>

                  <Group wrap="nowrap" gap="sm" ml="auto">
                    <NumberInput
                      aria-label={t("cart.quantityAria", { title: item.title })}
                      min={0}
                      max={item.stock}
                      allowDecimal={false}
                      allowNegative={false}
                      value={item.quantity}
                      onChange={(value) => typeof value === "number" && setQuantity(item.id, value)}
                      w={100}
                    />
                    <Text fw={700} miw={90} ta="right">
                      {formatPrice(item.price * item.quantity)}
                    </Text>
                    <ActionIcon
                      color="red"
                      variant="subtle"
                      aria-label={t("cart.removeAria", { title: item.title })}
                      onClick={() => removeWithUndo(item.id)}
                    >
                      <IconTrash size={18} />
                    </ActionIcon>
                  </Group>
                </Group>
              </Card>
            ))}

            <OrderSummary onCheckout={startCheckout} onClear={clearWithUndo} />
          </>
        )}
      </Stack>
    </Container>
  );
}

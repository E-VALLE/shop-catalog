import { notifications } from "@mantine/notifications";
import { useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router";
import type { CheckoutLocationState } from "../schemas/session-schema";
import { useAuth } from "./use-auth";

export type { CheckoutLocationState };

/**
 * Fluxo de "Finalizar compra". Sem sessão, leva ao login mantendo o carrinho (que já fica em
 * contexto + localStorage) e volta direto para a página de checkout depois de entrar.
 */
export function useCheckout(): { startCheckout: () => void } {
  const { t } = useTranslation();
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const startCheckout = useCallback(() => {
    if (!isAuthenticated) {
      notifications.show({ message: t("cart.loginRequired"), color: "blue" });
      const state: CheckoutLocationState = { from: "/checkout", checkout: true };
      navigate("/login", { state });
      return;
    }
    navigate("/checkout");
  }, [isAuthenticated, navigate, t]);

  return { startCheckout };
}

import { notifications } from "@mantine/notifications";
import axios, { isAxiosError } from "axios";
import i18n from "../i18n";
import { apiErrorSchema } from "../schemas/session-schema";

export const TOKEN_KEY = "shop-catalog:token";
export const UNAUTHORIZED_EVENT = "shop-catalog:unauthorized";

export const api = axios.create({
  baseURL: "https://dummyjson.com",
  headers: { "Content-Type": "application/json" },
});

/** Recurso inexistente ou identificador inválido (ex.: /produtos/abc). */
export class NotFoundError extends Error {
  constructor() {
    super("Não encontrado");
    this.name = "NotFoundError";
  }
}

export function getApiErrorMessage(error: unknown): string {
  if (error instanceof NotFoundError) return i18n.t("errors.notFound");
  if (isAxiosError(error)) {
    if (!error.response) {
      return i18n.t("errors.network");
    }
    // A mensagem da API para 404 vem em inglês ("Product with id '9' not found").
    if (error.response.status === 404) return i18n.t("errors.notFound");
    const body = apiErrorSchema.safeParse(error.response.data);
    if (body.success) return body.data.message;
  }
  return i18n.t("errors.generic");
}

api.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_KEY);
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error: unknown) => {
    if (isAxiosError(error)) {
      // Falhas de login (400) são tratadas no próprio formulário.
      const url = error.config?.url ?? "";
      const isLogin = url.includes("/auth/login");
      // A consulta do papel (/auth/me) falha em silêncio: o app apenas trata o usuário como cliente.
      const isRoleLookup = url.includes("/auth/me");
      if (!isLogin && error.response?.status === 401) {
        window.dispatchEvent(new Event(UNAUTHORIZED_EVENT));
      }
      if (!isLogin && !isRoleLookup && !axios.isCancel(error)) {
        notifications.show({
          title: i18n.t("errors.requestTitle"),
          message: getApiErrorMessage(error),
          color: "red",
        });
      }
    }
    return Promise.reject(error);
  },
);

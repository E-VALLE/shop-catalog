import { loginResponseSchema, type LoginResponse, type LoginValues } from "../schemas/login-schema";
import { meResponseSchema, type UserRole } from "../schemas/session-schema";
import { InvalidResponseError } from "./products-service";
import { api } from "./api";

export async function login(values: LoginValues): Promise<LoginResponse> {
  const { data } = await api.post<unknown>("/auth/login", {
    ...values,
    expiresInMins: 60,
  });
  const parsed = loginResponseSchema.safeParse(data);
  if (!parsed.success) throw new InvalidResponseError("login");
  return parsed.data;
}

/**
 * Papel do usuário logado. O login da DummyJSON não o devolve; `/auth/me` sim (usa o token salvo).
 * Nunca lança: qualquer falha vira "user", para um erro de rede jamais promover alguém a admin.
 */
export async function fetchRole(): Promise<UserRole> {
  try {
    const { data } = await api.get<unknown>("/auth/me");
    const parsed = meResponseSchema.safeParse(data);
    return parsed.success ? parsed.data.role : "user";
  } catch {
    return "user";
  }
}

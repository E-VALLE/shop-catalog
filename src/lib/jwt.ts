import { z } from "zod";

const payloadSchema = z.object({ exp: z.number().positive().optional() });

/**
 * Lê a data de expiração (`exp`, em segundos Unix) do payload de um JWT, SEM verificar a assinatura:
 * serve apenas para deslogar a interface com antecedência; quem valida o token é sempre o servidor.
 * Devolve `null` se o token não for um JWT legível ou não tiver `exp`.
 */
export function getJwtExpiry(token: string): number | null {
  const segment = token.split(".")[1];
  if (!segment) return null;
  try {
    const base64 = segment.replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), "=");
    const json = new TextDecoder().decode(
      Uint8Array.from(atob(padded), (char) => char.charCodeAt(0)),
    );
    const parsed = payloadSchema.safeParse(JSON.parse(json));
    return parsed.success ? (parsed.data.exp ?? null) : null;
  } catch {
    return null;
  }
}

/** Token expirado (ou prestes a expirar, dentro de `skewSeconds`). Sem `exp` legível: não expira. */
export function isTokenExpired(token: string, nowMs = Date.now(), skewSeconds = 0): boolean {
  const expiry = getJwtExpiry(token);
  return expiry !== null && expiry * 1000 - skewSeconds * 1000 <= nowMs;
}

/** Milissegundos até o token expirar; `null` se não houver `exp`. Nunca negativo. */
export function msUntilExpiry(token: string, nowMs = Date.now()): number | null {
  const expiry = getJwtExpiry(token);
  return expiry === null ? null : Math.max(expiry * 1000 - nowMs, 0);
}

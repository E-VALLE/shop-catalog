import { z } from "zod";

/** Papéis da DummyJSON. Qualquer valor ausente ou desconhecido vira "user" (o menos privilegiado). */
export const userRoleSchema = z.enum(["admin", "moderator", "user"]).catch("user");

export type UserRole = z.infer<typeof userRoleSchema>;

/** Resposta de `GET /auth/me`: só o papel interessa. */
export const meResponseSchema = z.object({ role: userRoleSchema });

/** Usuário da sessão, persistido em localStorage (dado externo: sempre validado ao ler). */
export const sessionUserSchema = z.object({
  id: z.number(),
  username: z.string(),
  firstName: z.string(),
  lastName: z.string(),
  // Sessões salvas antes dos papéis não têm `role`: valem como cliente até o próximo login.
  role: userRoleSchema,
});

export type SessionUser = z.infer<typeof sessionUserSchema>;

/** Cotação guardada no cache do navegador. */
export const storedQuoteSchema = z.object({
  rate: z.number().positive().finite(),
  quotedAt: z.string().min(1),
  savedAt: z.number(),
});

/** Estado de navegação usado no fluxo "Finalizar compra → login → voltar". */
export const checkoutStateSchema = z.object({
  // Só caminhos internos ("/x"), nunca "//host" ou URLs absolutas: evita redirecionamento aberto.
  from: z
    .string()
    .regex(/^\/(?!\/)/)
    .optional(),
  checkout: z.boolean().optional(),
});

export type CheckoutLocationState = z.infer<typeof checkoutStateSchema>;

export function parseCheckoutState(state: unknown): CheckoutLocationState {
  const parsed = checkoutStateSchema.safeParse(state);
  return parsed.success ? parsed.data : {};
}

export const apiErrorSchema = z.object({ message: z.string().min(1) });

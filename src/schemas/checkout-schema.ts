import { z } from "zod";
import { MAX_INSTALLMENTS, PAYMENT_METHODS } from "../helpers/payment";

/** Escolha de pagamento (simulada). Nenhum dado de cartão existe aqui, de propósito. */
export const paymentSelectionSchema = z.object({
  method: z.enum(PAYMENT_METHODS),
  installments: z.number().int().min(1).max(MAX_INSTALLMENTS),
});

export type PaymentSelection = z.infer<typeof paymentSelectionSchema>;

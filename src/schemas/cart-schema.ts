import { z } from "zod";

export const cartItemSchema = z.object({
  id: z.number(),
  title: z.string(),
  /** Preço unitário já com desconto. */
  price: z.number(),
  /** Preço de tabela (antes do desconto); ausente em carrinhos salvos por versões antigas. */
  listPrice: z.number().optional(),
  thumbnail: z.string(),
  quantity: z.number().int().positive(),
});

export type CartItem = z.infer<typeof cartItemSchema>;

export const storedCartSchema = z.array(cartItemSchema);

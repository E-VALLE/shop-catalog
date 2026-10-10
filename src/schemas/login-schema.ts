import { z } from "zod";

export const loginSchema = z.object({
  username: z.string().trim().min(1, "validation.usernameRequired"),
  password: z.string().min(6, "validation.passwordMin"),
});

export type LoginValues = z.infer<typeof loginSchema>;

export const loginResponseSchema = z.object({
  id: z.number(),
  username: z.string(),
  email: z.string().optional(),
  firstName: z.string(),
  lastName: z.string(),
  image: z.string().optional(),
  accessToken: z.string(),
});

export type LoginResponse = z.infer<typeof loginResponseSchema>;

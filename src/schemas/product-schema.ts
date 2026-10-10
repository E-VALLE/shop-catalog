import { z } from "zod";

export const reviewSchema = z.object({
  rating: z.number().min(0).max(5),
  comment: z.string(),
  date: z.string(),
  reviewerName: z.string(),
});

export type Review = z.infer<typeof reviewSchema>;

export const productSchema = z.object({
  id: z.number(),
  title: z.string(),
  description: z.string(),
  category: z.string(),
  price: z.number(),
  discountPercentage: z.number().optional(),
  rating: z.number().optional(),
  stock: z.number().optional(),
  brand: z.string().optional(),
  thumbnail: z.string(),
  images: z.array(z.string()).default([]),
  reviews: z.array(reviewSchema).optional(),
});

export type Product = z.infer<typeof productSchema>;

export const productsResponseSchema = z.object({
  products: z.array(productSchema),
  total: z.number(),
  skip: z.number(),
  limit: z.number(),
});

export type ProductsResponse = z.infer<typeof productsResponseSchema>;

export const categorySchema = z.object({
  slug: z.string(),
  name: z.string(),
  url: z.string(),
});

export const categoriesResponseSchema = z.array(categorySchema);

export type Category = z.infer<typeof categorySchema>;

export const productFormSchema = z.object({
  title: z.string().trim().min(3, "validation.titleMin"),
  description: z.string().trim().min(10, "validation.descriptionMin"),
  category: z.string().min(1, "validation.categoryRequired"),
  price: z.number({ error: "validation.priceRequired" }).positive("validation.pricePositive"),
  stock: z
    .number({ error: "validation.stockRequired" })
    .int("validation.stockInt")
    .min(0, "validation.stockMin"),
});

export type ProductFormValues = z.infer<typeof productFormSchema>;

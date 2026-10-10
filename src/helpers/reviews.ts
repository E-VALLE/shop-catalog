import type { Review } from "../schemas/product-schema";

/** Nota média arredondada a uma casa; `null` sem avaliações. */
export function averageRating(reviews: Review[]): number | null {
  if (reviews.length === 0) return null;
  const total = reviews.reduce((sum, review) => sum + review.rating, 0);
  return Math.round((total / reviews.length) * 10) / 10;
}

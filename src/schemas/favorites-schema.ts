import { z } from "zod";

/** Favoritos persistidos: apenas ids de produtos (os dados vêm do catálogo em cache). */
export const storedFavoritesSchema = z.array(z.number().int().positive());

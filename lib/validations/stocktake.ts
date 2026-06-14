import { z } from "zod";

export const stocktakeSchema = z.object({
  storeId: z.string().uuid(),
  items: z
    .array(
      z.object({
        variantId: z.string().uuid(),
        counted: z.number().int().min(0),
      }),
    )
    .min(1),
});

export type StocktakeInput = z.infer<typeof stocktakeSchema>;

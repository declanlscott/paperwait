import { z } from "astro/zod";

import type { Primitive } from "astro/zod";

export function unionizeCollection<Collection extends Primitive[]>(
  collection: Collection,
  params?: z.RawCreateParams,
) {
  return z.union(
    collection.map((element) => z.literal(element)) as unknown as readonly [
      z.ZodLiteral<Collection[number]>,
      z.ZodLiteral<Collection[number]>,
      ...z.ZodLiteral<Collection[number]>[],
    ],
    params,
  );
}

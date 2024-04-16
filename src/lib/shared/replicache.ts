import { z } from "astro/zod";

import { unionizeCollection } from "~/utils/zod";

import type { UserRole } from "~/lib/server/db/schema";

export const mutationMeta = {
  updateUserRole: {
    name: "updateUserRole",
    roleSet: new Set(["administrator"]),
  },
  createOrder: {
    name: "createOrder",
    roleSet: new Set(["administrator", "technician", "manager", "customer"]),
  },
} as const satisfies Record<string, { name: string; roleSet: Set<UserRole> }>;

export const mutationSchema = z.object({
  id: z.number(),
  clientId: z.string(),
  name: unionizeCollection(Object.values(mutationMeta).map(({ name }) => name)),
  args: z.unknown(),
});
export type Mutation = z.infer<typeof mutationSchema>;

export const pushRequestSchema = z.object({
  clientGroupId: z.string(),
  mutations: z.array(mutationSchema),
});
export type PushRequest = z.infer<typeof pushRequestSchema>;

import {
  array,
  literal,
  nullable,
  number,
  object,
  picklist,
  string,
  union,
  unknown,
} from "valibot";

import { userRole } from "../user";
import { nanoIdSchema } from "../utils";

import type { Output } from "valibot";
import type { UserRole } from "../user";

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

export const mutationSchema = object({
  id: number(),
  clientId: string(),
  name: union(Object.values(mutationMeta).map(({ name }) => literal(name))),
  args: unknown(),
});
export type Mutation = Output<typeof mutationSchema>;

export const pushRequestSchema = object({
  clientGroupId: string(),
  mutations: array(mutationSchema),
});
export type PushRequest = Output<typeof pushRequestSchema>;

export const pullRequestSchema = object({
  clientGroupId: string(),
  cookie: nullable(object({ order: number(), cvrId: string() })),
});
export type PullRequest = Output<typeof pullRequestSchema>;

export const updateUserRoleSchema = object({
  userId: nanoIdSchema,
  role: picklist(userRole.enumValues),
});

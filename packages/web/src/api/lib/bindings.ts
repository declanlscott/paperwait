import { SessionSchema } from "@paperwait/core/auth";
import { OrganizationSchema } from "@paperwait/core/organization";
import { UserSchema } from "@paperwait/core/user";
import * as v from "valibot";

export type BindingsInput = Record<keyof App.Locals, string>;

export const BindingsOutput = v.object({
  session: v.nullable(
    v.object({ ...SessionSchema.entries, fresh: v.boolean() }),
  ),
  user: v.nullable(v.omit(UserSchema, ["createdAt", "updatedAt", "deletedAt"])),
  org: v.nullable(v.pick(OrganizationSchema, ["slug", "name"])),
});
export type BindingsOutput = v.InferInput<typeof BindingsOutput>;

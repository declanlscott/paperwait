import { enforceRbac, mutationRbac, rbacErrorMessage } from "../auth/rbac";
import { AccessDenied, EntityNotFound } from "../errors/application";
import { optimisticMutator } from "../utils/client";
import { tenantsTableName, updateTenantMutationArgsSchema } from "./shared";

import type { DeepReadonlyObject } from "replicache";
import type { Tenant } from "./sql";

export const update = optimisticMutator(
  updateTenantMutationArgsSchema,
  (user) =>
    enforceRbac(user, mutationRbac.updateTenant, {
      Error: AccessDenied,
      args: [rbacErrorMessage(user, "update tenant mutator")],
    }),
  () =>
    async (tx, { id, ...values }) => {
      const prev = await tx.get<Tenant>(`${tenantsTableName}/${id}`);
      if (!prev) throw new EntityNotFound(tenantsTableName, id);

      const next = {
        ...prev,
        ...values,
      } satisfies DeepReadonlyObject<Tenant>;

      return tx.set(`${tenantsTableName}/${id}`, next);
    },
);

export { tenantSchema as schema } from "./shared";

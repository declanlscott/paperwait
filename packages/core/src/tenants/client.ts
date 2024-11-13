import { mutationRbac } from "../replicache/shared";
import { Utils } from "../utils/client";
import { ApplicationError } from "../utils/errors";
import { enforceRbac } from "../utils/shared";
import { tenantsTableName, updateTenantMutationArgsSchema } from "./shared";

import type { DeepReadonlyObject } from "replicache";
import type { Tenant } from "./sql";

export namespace Tenants {
  export const update = Utils.optimisticMutator(
    updateTenantMutationArgsSchema,
    (user, _tx, { id }) =>
      enforceRbac(user, mutationRbac.updateTenant, {
        Error: ApplicationError.AccessDenied,
        args: [{ name: tenantsTableName, id }],
      }),
    () =>
      async (tx, { id, ...values }) => {
        const prev = await tx.get<Tenant>(`${tenantsTableName}/${id}`);
        if (!prev)
          throw new ApplicationError.EntityNotFound({
            name: tenantsTableName,
            id,
          });

        const next = {
          ...prev,
          ...values,
        } satisfies DeepReadonlyObject<Tenant>;

        return tx.set(`${tenantsTableName}/${id}`, next);
      },
  );
}

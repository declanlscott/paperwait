import { AccessControl } from "../access-control/client";
import { Utils } from "../utils/client";
import { ApplicationError } from "../utils/errors";
import { tenantsTableName, updateTenantMutationArgsSchema } from "./shared";

import type { DeepReadonlyObject } from "replicache";
import type { Tenant } from "./sql";

export namespace Tenants {
  export const update = Utils.optimisticMutator(
    updateTenantMutationArgsSchema,
    async (tx, user, { id }) =>
      AccessControl.enforce([tx, user, tenantsTableName, "update"], {
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

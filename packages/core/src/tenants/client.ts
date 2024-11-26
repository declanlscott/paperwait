import { AccessControl } from "../access-control/client";
import { Replicache } from "../replicache/client";
import { Utils } from "../utils/client";
import { ApplicationError } from "../utils/errors";
import { tenantsTableName, updateTenantMutationArgsSchema } from "./shared";

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
        const prev = await Replicache.get<Tenant>(tx, tenantsTableName, id);

        return Replicache.set(tx, tenantsTableName, id, {
          ...prev,
          ...values,
        });
      },
  );
}

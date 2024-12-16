import { Replicache } from "@printworks/core/replicache/client";
import { tenantsTableName } from "@printworks/core/tenants/shared";
import { ApplicationError } from "@printworks/core/utils/errors";

import { useUserActor } from "~/app/lib/hooks/actor";
import { useQuery } from "~/app/lib/hooks/data";

export function useTenant() {
  const { tenantId } = useUserActor();

  const tenant = useQuery((tx) =>
    Replicache.get(tx, tenantsTableName, tenantId),
  );
  if (!tenant)
    throw new ApplicationError.EntityNotFound({
      name: tenantsTableName,
      id: tenantId,
    });

  return tenant;
}

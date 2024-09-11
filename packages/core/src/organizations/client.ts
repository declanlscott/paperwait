import { enforceRbac, mutationRbac, rbacErrorMessage } from "../auth/rbac";
import { AccessDenied, EntityNotFound } from "../errors/application";
import { optimisticMutator } from "../utils/helpers";
import {
  organizationsTableName,
  updateOrganizationMutationArgsSchema,
} from "./shared";

import type { DeepReadonlyObject } from "replicache";
import type { Organization } from "./sql";

export const update = optimisticMutator(
  updateOrganizationMutationArgsSchema,
  (user) =>
    enforceRbac(user, mutationRbac.updateOrganization, {
      Error: AccessDenied,
      args: [rbacErrorMessage(user, "update organization mutator")],
    }),
  () =>
    async (tx, { id, ...values }) => {
      const prev = await tx.get<Organization>(
        `${organizationsTableName}/${id}`,
      );
      if (!prev) throw new EntityNotFound(organizationsTableName, id);

      const next = {
        ...prev,
        ...values,
      } satisfies DeepReadonlyObject<Organization>;

      return tx.set(`${organizationsTableName}/${id}`, next);
    },
);

export { organizationSchema as schema } from "./shared";

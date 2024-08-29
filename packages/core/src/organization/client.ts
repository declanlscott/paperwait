import { enforceRbac, mutationRbac } from "../auth/rbac";
import {
  EntityNotFoundError,
  InvalidUserRoleError,
} from "../errors/application";
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
    enforceRbac(user, mutationRbac.updateOrganization, InvalidUserRoleError),
  () =>
    async (tx, { id, ...values }) => {
      const prev = await tx.get<Organization>(
        `${organizationsTableName}/${id}`,
      );
      if (!prev) throw new EntityNotFoundError(organizationsTableName, id);

      const next = {
        ...prev,
        ...values,
      } satisfies DeepReadonlyObject<Organization>;

      return tx.set(`${organizationsTableName}/${id}`, next);
    },
);

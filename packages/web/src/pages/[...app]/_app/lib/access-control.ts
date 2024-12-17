import { queryFactory } from "~/app/lib/hooks/data";

import type { UserRole } from "@printworks/core/users/shared";
import type { User, UserWithProfile } from "@printworks/core/users/sql";
import type { DeepReadonlyObject, ReadTransaction } from "replicache";
import type { AuthenticatedEagerRouteId } from "~/app/types";

export type RoutePermissions = Record<
  AuthenticatedEagerRouteId,
  Record<
    UserRole,
    | boolean
    | ((
        tx: ReadTransaction,
        user: DeepReadonlyObject<UserWithProfile>,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ...input: Array<any>
      ) => boolean | Promise<boolean>)
  >
>;

export const routePermissions = {
  "/_authenticated/dashboard": {
    administrator: true,
    operator: true,
    manager: true,
    customer: true,
  },
  "/_authenticated/products/": {
    administrator: true,
    operator: true,
    manager: true,
    customer: true,
  },
  "/_authenticated/settings/": {
    administrator: true,
    operator: true,
    manager: true,
    customer: true,
  },
  "/_authenticated/settings/images": {
    administrator: true,
    operator: true,
    manager: false,
    customer: false,
  },
  "/_authenticated/settings/integrations": {
    administrator: true,
    operator: false,
    manager: false,
    customer: false,
  },
  "/_authenticated/settings/rooms": {
    administrator: true,
    operator: true,
    manager: false,
    customer: false,
  },
  "/_authenticated/settings/rooms/$roomId/": {
    administrator: true,
    operator: true,
    manager: false,
    customer: false,
  },
  "/_authenticated/settings/rooms/$roomId/configuration": {
    administrator: true,
    operator: true,
    manager: false,
    customer: false,
  },
  "/_authenticated/settings/rooms/$roomId/cost-scripts": {
    administrator: true,
    operator: true,
    manager: false,
    customer: false,
  },
  "/_authenticated/settings/rooms/$roomId/products": {
    administrator: true,
    operator: true,
    manager: false,
    customer: false,
  },
  "/_authenticated/settings/rooms/$roomId/products/$productId/": {
    administrator: true,
    operator: true,
    manager: false,
    customer: false,
  },
  "/_authenticated/users/": {
    administrator: true,
    operator: true,
    manager: true,
    customer: true,
  },
  "/_authenticated/users/$userId": {
    administrator: true,
    operator: true,
    manager: async (tx, manager, userId: User["id"]) => {
      const getManagedCustomerIds = queryFactory.managedCustomerIds(manager.id);

      return getManagedCustomerIds(tx).then((customerIds) =>
        customerIds.includes(userId),
      );
    },
    customer: (_, user, userId: User["id"]) => user.id === userId,
  },
} satisfies RoutePermissions;

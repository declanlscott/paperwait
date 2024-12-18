import { AccessControl } from "@printworks/core/access-control/client";
import { useQuery } from "@tanstack/react-query";

import { checkRoutePermission } from "~/app/lib/access-control";
import { useReplicache } from "~/app/lib/hooks/replicache";
import { useUser } from "~/app/lib/hooks/user";

import type { PropsWithChildren, ReactNode } from "react";
import type { Action, Resource } from "@printworks/core/access-control/shared";
import type { UserRole } from "@printworks/core/users/shared";
import type { UserWithProfile } from "@printworks/core/users/sql";
import type {
  DeepReadonlyObject,
  ReadTransaction,
  WriteTransaction,
} from "replicache";
import type { routePermissions } from "~/app/lib/access-control";
import type { AuthenticatedEagerRouteId } from "~/app/types";

export type EnforceAbacProps<
  TResource extends Resource,
  TAction extends Action,
  TPermission extends
    (typeof AccessControl.permissionsFactory)[UserRole][TResource][TAction],
> = PropsWithChildren<{
  resource: TResource;
  action: TAction;
  input: TPermission extends (
    tx: WriteTransaction,
    user: DeepReadonlyObject<UserWithProfile>,
    ...input: infer TInput
  ) => unknown
    ? TInput
    : Array<never>;
  unauthorized?: ReactNode;
}>;

export function EnforceAbac<
  TResource extends Resource,
  TAction extends Action,
  TPermission extends
    (typeof AccessControl.permissionsFactory)[UserRole][TResource][TAction],
>({
  resource,
  action,
  input,
  unauthorized = null,
  children,
}: EnforceAbacProps<TResource, TAction, TPermission>) {
  const user = useUser();
  const replicache = useReplicache();

  const query = useQuery({
    queryKey: [user.id, resource, action, ...input],
    queryFn: async () =>
      replicache.client.query((tx) =>
        AccessControl.check(
          tx as WriteTransaction,
          user,
          resource,
          action,
          ...input,
        ),
      ),
  });

  if (!query.data) return <>{unauthorized}</>;

  return <>{children}</>;
}

export type EnforceRouteAbacProps<
  TRouteId extends AuthenticatedEagerRouteId,
  TPermission extends (typeof routePermissions)[UserRole][TRouteId],
> = PropsWithChildren<{
  routeId: TRouteId;
  input: TPermission extends (
    tx: ReadTransaction,
    user: DeepReadonlyObject<UserWithProfile>,
    ...input: infer TInput
  ) => unknown
    ? TInput
    : Array<never>;
  unauthorized?: ReactNode;
}>;

export function EnforceRouteAbac<
  TRouteId extends AuthenticatedEagerRouteId,
  TPermission extends (typeof routePermissions)[UserRole][TRouteId],
>({
  routeId,
  input,
  unauthorized = null,
  children,
}: EnforceRouteAbacProps<TRouteId, TPermission>) {
  const user = useUser();
  const replicache = useReplicache();

  const query = useQuery({
    queryKey: [user.id, routeId, ...input],
    queryFn: async () =>
      replicache.client.query((tx) =>
        checkRoutePermission(tx, user, routeId, ...input),
      ),
  });

  if (!query.data) return <>{unauthorized}</>;

  return <>{children}</>;
}

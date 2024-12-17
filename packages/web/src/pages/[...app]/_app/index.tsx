import { useCallback, useMemo, useState } from "react";
import { Replicache } from "@printworks/core/replicache/client";
import { usersTableName } from "@printworks/core/users/shared";
import { ApplicationError } from "@printworks/core/utils/errors";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createRouter, redirect, RouterProvider } from "@tanstack/react-router";
import { Toaster } from "sonner";

import { ActorProvider } from "~/app/components/providers/actor";
import { ReplicacheProvider } from "~/app/components/providers/replicache";
import { ResourceProvider } from "~/app/components/providers/resource";
import { SlotProvider } from "~/app/components/providers/slot";
import { routePermissions } from "~/app/lib/access-control";
import { useActor } from "~/app/lib/hooks/actor";
import { useReplicache } from "~/app/lib/hooks/replicache";
import { useResource } from "~/app/lib/hooks/resource";
import { initialLoginSearchParams } from "~/app/lib/schemas";
import { routeTree } from "~/app/routeTree.gen";

import type { Actor } from "@printworks/core/actors/shared";
import type { Resource } from "sst";
import type { RoutePermissions } from "~/app/lib/access-control";
import type { AuthActions } from "~/app/lib/contexts";
import type { AppRouter, Slot } from "~/app/types";

const queryClient = new QueryClient();

export interface AppProps extends Partial<Slot> {
  clientResource: Resource["Client"];
  actor: Actor;
}

export function App(props: AppProps) {
  const { clientResource, actor, loadingIndicator, logo } = props;

  const [router] = useState(() =>
    createRouter({
      routeTree,
      context: {
        // These will be set after we wrap the app router in providers
        actor: undefined!,
        auth: undefined!,
        replicache: undefined!,
        resource: undefined!,
        queryClient,
      },
      defaultPendingComponent: () => loadingIndicator,
    }),
  );

  // Hide the initial loading indicator
  // Router will handle the loading indicator afterwards with `defaultPendingComponent`
  document
    .getElementById("initial-app-loading-indicator")
    ?.style.setProperty("display", "none");

  return (
    <ResourceProvider resource={clientResource}>
      <SlotProvider slot={{ loadingIndicator, logo }}>
        <ActorProvider actor={actor}>
          <ReplicacheProvider router={router}>
            <QueryClientProvider client={queryClient}>
              <AppRouter router={router} />

              <Toaster richColors />
            </QueryClientProvider>
          </ReplicacheProvider>
        </ActorProvider>
      </SlotProvider>
    </ResourceProvider>
  );
}

type AppRouterProps = {
  router: AppRouter;
};

function AppRouter(props: AppRouterProps) {
  const actor = useActor();
  const replicache = useReplicache();
  const resource = useResource();

  const authenticateRoute: AuthActions["authenticateRoute"] = useCallback(
    (from) => {
      if (actor.type !== "user")
        throw redirect({
          to: "/login",
          search: { redirect: from, ...initialLoginSearchParams },
        });

      return actor;
    },
    [actor],
  );

  const authorizeRoute: AuthActions["authorizeRoute"] = useCallback(
    async (tx, userId, routeId, ...input) => {
      const user = await Replicache.get(tx, usersTableName, userId);

      const permission = (routePermissions as RoutePermissions)[routeId][
        user.profile.role
      ];

      const access = await new Promise<boolean>((resolve) => {
        if (typeof permission === "boolean") return resolve(permission);

        return resolve(permission(tx, user, ...input));
      });

      if (!access) throw new ApplicationError.AccessDenied();
    },
    [],
  );

  const auth = useMemo(
    () => ({ authenticateRoute, authorizeRoute }),
    [authenticateRoute, authorizeRoute],
  );

  return (
    <RouterProvider
      router={props.router}
      context={{ actor, auth, replicache, resource, queryClient }}
    />
  );
}

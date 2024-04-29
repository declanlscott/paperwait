import { useLayoutEffect, useState } from "react";
import { createRouter, RouterProvider } from "@tanstack/react-router";

import { AuthProvider, useAuthStore } from "~/app/lib/auth";
import { ResourceProvider, useResource } from "~/app/lib/resource";
import { SlotProvider } from "~/app/lib/slot";
import { routeTree } from "~/app/routeTree.gen";

import type { ClientResourceType } from "@paperwait/core/types";
import type { Auth } from "~/app/lib/auth";
import type { Slot } from "~/app/lib/slot";

type AppRouter = ReturnType<
  typeof createRouter<typeof routeTree, "always" | "never" | "preserve">
>;

declare module "@tanstack/react-router" {
  interface Register {
    router: AppRouter;
  }
}

export interface AppProps extends Auth, Partial<Slot> {
  clientResource: ClientResourceType;
}

export function App(props: AppProps) {
  const { clientResource, user, session, loadingIndicator } = props;

  const [router] = useState(() =>
    createRouter({
      routeTree,
      context: {
        // These will be set after we wrap the app router in providers
        resource: undefined!,
        authStore: undefined!,
      },
      defaultPendingComponent: () => loadingIndicator,
    }),
  );

  // Hide initial loading indicator after first render
  // Router will handle the loading indicator afterwards with `defaultPendingComponent`
  useLayoutEffect(
    () =>
      document
        .getElementById("app-loading-indicator")
        ?.style.setProperty("display", "none"),
    [],
  );

  return (
    <ResourceProvider resource={clientResource}>
      <AuthProvider initialData={{ user, session }}>
        <SlotProvider slot={{ loadingIndicator }}>
          <AppRouter router={router} />
        </SlotProvider>
      </AuthProvider>
    </ResourceProvider>
  );
}

type AppRouterProps = {
  router: AppRouter;
};

function AppRouter(props: AppRouterProps) {
  const resource = useResource();
  const authStore = useAuthStore((store) => store);

  return (
    <RouterProvider router={props.router} context={{ resource, authStore }} />
  );
}

import { useState } from "react";
import { createRouter, RouterProvider } from "@tanstack/react-router";

import { AuthProvider, useAuthStore } from "~/app/lib/auth";
import { ResourceProvider, useResource } from "~/app/lib/resource";
import { SlotProvider } from "~/app/lib/slot";
import { routeTree } from "~/app/routeTree.gen";

import type { ClientResourceType } from "@paperwait/core/types";
import type { Slot } from "~/app/lib/slot";

type AppRouter = ReturnType<
  typeof createRouter<typeof routeTree, "always" | "never" | "preserve">
>;

declare module "@tanstack/react-router" {
  interface Register {
    router: AppRouter;
  }
}

export interface AppProps extends Partial<Slot> {
  clientResource: ClientResourceType;
  initialAuth: {
    user: App.Locals["user"];
    session: App.Locals["session"];
    org: App.Locals["org"];
  };
}

export function App(props: AppProps) {
  const { clientResource, initialAuth, loadingIndicator } = props;

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

  // Hide the initial loading indicator
  // Router will handle the loading indicator afterwards with `defaultPendingComponent`
  document
    .getElementById("initial-app-loading-indicator")
    ?.style.setProperty("display", "none");

  return (
    <ResourceProvider resource={clientResource}>
      <AuthProvider initialAuth={initialAuth}>
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

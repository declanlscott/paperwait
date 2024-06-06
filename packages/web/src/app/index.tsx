import { useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createRouter, RouterProvider } from "@tanstack/react-router";

import { AuthStoreProvider } from "~/app/components/providers/auth";
import { ResourceProvider } from "~/app/components/providers/resource";
import { SlotProvider } from "~/app/components/providers/slot";
import { useAuthStore } from "~/app/lib/hooks/auth";
import { useResource } from "~/app/lib/hooks/resource";
import { routeTree } from "~/app/routeTree.gen";

import type { ClientResourceType } from "@paperwait/core/types";
import type { Auth, Slot } from "~/app/types";

type AppRouter = ReturnType<
  typeof createRouter<typeof routeTree, "always" | "never" | "preserve">
>;

declare module "@tanstack/react-router" {
  interface Register {
    router: AppRouter;
  }
}

const queryClient = new QueryClient();

export interface AppProps extends Partial<Slot> {
  clientResource: ClientResourceType;
  initialAuth: Auth;
}

export function App(props: AppProps) {
  const { clientResource, initialAuth, loadingIndicator, logo } = props;

  const [router] = useState(() =>
    createRouter({
      routeTree,
      context: {
        // These will be set after we wrap the app router in providers
        resource: undefined!,
        authStore: undefined!,
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
      <AuthStoreProvider initialAuth={initialAuth}>
        <SlotProvider slot={{ loadingIndicator, logo }}>
          <QueryClientProvider client={queryClient}>
            <AppRouter router={router} />
          </QueryClientProvider>
        </SlotProvider>
      </AuthStoreProvider>
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
    <RouterProvider
      router={props.router}
      context={{ resource, authStore, queryClient }}
    />
  );
}

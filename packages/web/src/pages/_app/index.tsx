import { useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createRouter, RouterProvider } from "@tanstack/react-router";
import { Toaster } from "sonner";

import { AuthStoreProvider } from "~/app/components/providers/auth";
import { ResourceProvider } from "~/app/components/providers/resource";
import { SlotProvider } from "~/app/components/providers/slot";
import { useAuthStore } from "~/app/lib/hooks/auth";
import { useResource } from "~/app/lib/hooks/resource";
import { routeTree } from "~/app/routeTree.gen";

import type { Resource } from "sst";
import type { AppRouter, Auth, Slot } from "~/app/types";

const queryClient = new QueryClient();

export interface AppProps extends Partial<Slot> {
  clientResource: Resource["Client"];
  auth: Auth;
}

export function App(props: AppProps) {
  const { clientResource, auth, loadingIndicator, logo } = props;

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
      <SlotProvider slot={{ loadingIndicator, logo }}>
        <AuthStoreProvider auth={auth} router={router}>
          <QueryClientProvider client={queryClient}>
            <AppRouter router={router} />

            <Toaster richColors />
          </QueryClientProvider>
        </AuthStoreProvider>
      </SlotProvider>
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

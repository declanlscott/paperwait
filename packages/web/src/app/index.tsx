import { useLayoutEffect, useState } from "react";
import { createRouter, RouterProvider } from "@tanstack/react-router";

import { AuthProvider, useAuthStore } from "~/app/lib/auth";
import { ResourceProvider, useResource } from "~/app/lib/resource";
import { routeTree } from "~/app/routeTree.gen";

import type { ClientResourceType } from "@paperwait/core/types";
import type { Auth } from "~/app/lib/auth";

const router = createRouter({
  routeTree,
  context: {
    // These will be set after we wrap the inner app in providers
    resource: undefined!,
    authStore: undefined!,
  },
});

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

export type AppProps = {
  debounceMs?: number;
  clientResource: ClientResourceType;
} & Auth;

export function App(props: AppProps) {
  const { debounceMs = 500, clientResource, user, session } = props;

  const [isVisible, setIsVisible] = useState(false);

  // Debounce the app loading indicator to prevent flickering
  useLayoutEffect(() => {
    const timeout = setTimeout(
      () =>
        setIsVisible(() => {
          document
            .getElementById("app-loading-indicator")
            ?.style.setProperty("display", "none");

          return true;
        }),
      debounceMs,
    );

    return () => clearTimeout(timeout);
  }, [debounceMs]);

  return (
    <ResourceProvider resource={clientResource}>
      <AuthProvider initialData={{ user, session }}>
        {isVisible && <InnerApp />}
      </AuthProvider>
    </ResourceProvider>
  );
}

function InnerApp() {
  const resource = useResource();
  const authStore = useAuthStore((store) => store);

  return <RouterProvider router={router} context={{ resource, authStore }} />;
}

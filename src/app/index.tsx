import { useLayoutEffect, useState } from "react";
import { createRouter, RouterProvider } from "@tanstack/react-router";

import { AuthProvider, useAuth } from "~/app/lib/auth";
import { ResourceProvider } from "~/app/lib/resource";
import { routeTree } from "~/app/routeTree.gen";

import type { Auth } from "~/app/lib/auth";
import type { ClientResource } from "~/lib/client-resource";

const router = createRouter({
  routeTree,
  context: {
    // These will be set after we wrap the app in providers
    resource: undefined!,
    auth: undefined!,
  },
});

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

type AppProps = {
  debounceMs?: number;
  clientResource: ClientResource;
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
  const auth = useAuth();

  return <RouterProvider router={router} context={{ auth }} />;
}

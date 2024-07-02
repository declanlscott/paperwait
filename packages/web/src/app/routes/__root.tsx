import { lazy, Suspense } from "react";
import { RouterProvider } from "react-aria-components";
import {
  createRootRouteWithContext,
  Outlet,
  ScrollRestoration,
  useRouter,
} from "@tanstack/react-router";

import type { QueryClient } from "@tanstack/react-query";
import type { AuthStore, ResourceContext } from "~/app/lib/contexts";

const TanStackRouterDevtools = import.meta.env.DEV
  ? lazy(() =>
      // Lazy load in development
      import("@tanstack/router-devtools").then((res) => ({
        default: res.TanStackRouterDevtools,
      })),
    )
  : () => null;

type RouterContext = {
  resource: ResourceContext;
  authStore: AuthStore;
  queryClient: QueryClient;
};

export const Route = createRootRouteWithContext<RouterContext>()({
  component: Component,
});

function Component() {
  const { navigate, buildLocation } = useRouter();

  return (
    <RouterProvider
      navigate={(to, options) => navigate({ to, ...options })}
      useHref={(to) => buildLocation({ to }).href}
    >
      <Outlet />

      <ScrollRestoration />

      <Suspense>
        <TanStackRouterDevtools position="bottom-right" />
      </Suspense>
    </RouterProvider>
  );
}

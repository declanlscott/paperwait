import { lazy, Suspense } from "react";
import { RouterProvider } from "react-aria-components";
import {
  createRootRouteWithContext,
  Outlet,
  ScrollRestoration,
  useRouter,
} from "@tanstack/react-router";

import type { QueryClient } from "@tanstack/react-query";
import type { NavigateOptions, ToOptions } from "@tanstack/react-router";
import type { AuthStore, ResourceContext } from "~/app/lib/contexts";
import type { Href } from "~/app/types";

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

declare module "react-aria-components" {
  interface RouterConfig {
    href: Href;
    routerOptions: Omit<NavigateOptions, keyof ToOptions>;
  }
}

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

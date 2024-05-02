import { lazy, Suspense } from "react";
import { RouterProvider } from "react-aria-components";
import {
  createRootRouteWithContext,
  Outlet,
  ScrollRestoration,
  useRouter,
} from "@tanstack/react-router";

import type {
  NavigateOptions,
  RegisteredRouter,
  RoutePaths,
  ToOptions,
  ToPathOption,
} from "@tanstack/react-router";
import type { AuthStore } from "~/app/lib/auth";
import type { ResourceContext } from "~/app/lib/resource";

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
};

export const Route = createRootRouteWithContext<RouterContext>()({
  component: () => <Component />,
});

declare module "react-aria-components" {
  interface RouterConfig {
    href: ToPathOption<
      RegisteredRouter,
      RoutePaths<RegisteredRouter["routeTree"]>,
      ""
    >;
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

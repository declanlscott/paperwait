import { lazy, Suspense } from "react";
import { RouterProvider } from "react-aria-components";
import {
  createRootRouteWithContext,
  Outlet,
  ScrollRestoration,
  useRouter,
} from "@tanstack/react-router";

import { BaseLayout } from "~/app/layouts/base-layout";
import { useAuth } from "~/app/lib/auth";

import type {
  NavigateOptions,
  RegisteredRouter,
  ToOptions,
  ToPathOption,
} from "@tanstack/react-router";
import type { AuthContext } from "~/app/lib/auth";
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
  auth: AuthContext;
};

export const Route = createRootRouteWithContext<RouterContext>()({
  component: () => <Component />,
});

declare module "react-aria-components" {
  interface RouterConfig {
    href: ToPathOption<RegisteredRouter["routeTree"]>;
    routerOptions: Omit<NavigateOptions, keyof ToOptions>;
  }
}

function Component() {
  const router = useRouter();
  const { isAuthenticated } = useAuth();

  return (
    <RouterProvider
      navigate={(to, options) => router.navigate({ to, ...options })}
      useHref={(to) => router.buildLocation({ to }).href}
    >
      <>
        {isAuthenticated ? <BaseLayout /> : <Outlet />}

        <ScrollRestoration />

        <Suspense>
          <TanStackRouterDevtools position="bottom-right" />
        </Suspense>
      </>
    </RouterProvider>
  );
}

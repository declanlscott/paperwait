import { lazy, Suspense } from "react";
import { RouterProvider } from "react-aria-components";
import {
  createRootRoute,
  ScrollRestoration,
  useRouter,
} from "@tanstack/react-router";

import { BaseLayout } from "~/app/layouts/base-layout";

import type {
  NavigateOptions,
  RegisteredRouter,
  ToOptions,
  ToPathOption,
} from "@tanstack/react-router";

const TanStackRouterDevtools = import.meta.env.PROD
  ? () => null // Render nothing in production
  : lazy(() =>
      // Lazy load in development
      import("@tanstack/router-devtools").then((res) => ({
        default: res.TanStackRouterDevtools,
      })),
    );

export const Route = createRootRoute({
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

  return (
    <RouterProvider
      navigate={(to, options) => router.navigate({ to, ...options })}
      useHref={(to) => router.buildLocation({ to }).href}
    >
      <>
        <BaseLayout />

        <ScrollRestoration />

        <Suspense>
          <TanStackRouterDevtools position="bottom-right" />
        </Suspense>
      </>
    </RouterProvider>
  );
}

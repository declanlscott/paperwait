import { useState } from "react";
import {
  createRouter,
  RouterProvider,
  useLayoutEffect,
} from "@tanstack/react-router";

import { SstResourceContext } from "~/app/lib/context";
import { routeTree } from "~/app/routeTree.gen";

import type { ClientResource } from "~/lib/client-resource";

const router = createRouter({ routeTree });

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

type AppProps = {
  debounceMs?: number;
  sstResource: ClientResource;
};

export function App(props: AppProps) {
  const { debounceMs = 500, sstResource } = props;

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
    <SstResourceContext.Provider value={sstResource}>
      {isVisible && <RouterProvider router={router} />}
    </SstResourceContext.Provider>
  );
}

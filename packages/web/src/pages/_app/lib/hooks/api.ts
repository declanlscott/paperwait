import { useMemo } from "react";
import { hc } from "hono/client";

import { useResource } from "~/app/lib/hooks/resource";

import type { Api } from "~/api/index";

export function useApi() {
  const { isDev, domain } = useResource();

  const client = useMemo(
    () =>
      hc<Api>(isDev === "true" ? "http://localhost:4321" : `https://${domain}`),
    [isDev, domain],
  );

  return { client };
}

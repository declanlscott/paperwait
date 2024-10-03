import { useMemo } from "react";
import { hc } from "hono/client";

import { useResource } from "~/app/lib/hooks/resource";

import type { Api } from "~/api/index";

export function useApi() {
  const { isDev, appFqdn } = useResource();

  const client = useMemo(
    () => hc<Api>(isDev ? "http://localhost:4321" : `https://${appFqdn}`),
    [isDev, appFqdn],
  );

  return { client };
}

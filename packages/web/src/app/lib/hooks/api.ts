import { hc } from "hono/client";

import { useResource } from "~/app/lib/hooks/resource";

import type { Api } from "~/api/index";

export function useApi() {
  const { IsDev, Domain } = useResource();

  const client = hc<Api>(
    IsDev ? "http://localhost:4321" : `https://${Domain.value}`,
  );

  return { client };
}

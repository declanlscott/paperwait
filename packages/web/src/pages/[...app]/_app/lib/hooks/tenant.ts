import { getRouteApi } from "@tanstack/react-router";

import { useUserActor } from "~/app/lib/hooks/actor";
import { query, useQuery } from "~/app/lib/hooks/data";

const authenticatedRouteApi = getRouteApi("/_authenticated");

export const useTenant = () =>
  useQuery(query.tenant(useUserActor().tenantId), {
    defaultData: authenticatedRouteApi.useLoaderData().initialTenant,
  });

import { Resource } from "sst";

import { CLIENT_RESOURCE_PREFIX } from "../constants";

import type { ClientResourceType } from "../types";

export const ClientResource = Object.entries({ ...Resource }).reduce(
  (clientResource, [key, value]) => {
    if (key.startsWith(CLIENT_RESOURCE_PREFIX) && value) {
      clientResource[key.slice(CLIENT_RESOURCE_PREFIX.length)] = value;
    }

    return clientResource;
  },
  {} as Record<string, unknown>,
) as ClientResourceType;

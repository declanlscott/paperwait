import { Resource } from "sst";

import { CLIENT_RESOURCE_PREFIX } from "../constants";

import type { ClientResourceType } from "../types";

const resource: Record<string, unknown> = { ...Resource };

export const ClientResource = Object.entries(resource).reduce(
  (clientResource, [key, value]) => {
    if (key.startsWith(CLIENT_RESOURCE_PREFIX) && value) {
      clientResource[key.slice(CLIENT_RESOURCE_PREFIX.length)] = value;
    }

    return clientResource;
  },
  {} as typeof resource,
) as ClientResourceType;

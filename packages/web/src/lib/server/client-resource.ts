import { CLIENT_RESOURCE_PREFIX } from "@paperwait/core/constants";
import { Resource } from "sst";

import type { ClientResourceType } from "../shared/client-resource";

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

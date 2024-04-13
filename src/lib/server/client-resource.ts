import { Resource } from "sst";

import { ClientPrefix } from "~/lib/shared/client-resource";

import type { ClientResourceType } from "~/lib/shared/client-resource";

const resource: Record<string, unknown> = { ...Resource };

export const ClientResource = Object.entries(resource).reduce(
  (clientResource, [key, value]) => {
    if (key.startsWith(ClientPrefix) && value) {
      clientResource[key.slice(ClientPrefix.length)] = value;
    }

    return clientResource;
  },
  {} as typeof resource,
) as ClientResourceType;

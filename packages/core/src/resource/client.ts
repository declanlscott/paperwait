import { Resource } from "sst";

import { CLIENT_RESOURCE_PREFIX } from "../constants";

import type { ClientResource } from "../types/resource";

export const clientResource = Object.entries({ ...Resource }).reduce(
  (result, [key, value]) => {
    if (key.startsWith(CLIENT_RESOURCE_PREFIX) && value)
      result[key.slice(CLIENT_RESOURCE_PREFIX.length)] = value;

    return result;
  },
  {} as Record<string, unknown>,
) as ClientResource;

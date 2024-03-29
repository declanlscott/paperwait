import { Resource } from "sst";

const resource: Record<string, unknown> = { ...Resource };

export const ClientPrefix = "Client";
export const ClientResource = Object.entries(resource).reduce(
  (clientResource, [key, value]) => {
    if (key.startsWith(ClientPrefix) && value) {
      clientResource[key.slice(ClientPrefix.length)] = value;
    }

    return clientResource;
  },
  {} as typeof resource,
) as ClientResource;

export type ClientPrefix = typeof ClientPrefix;
export type ClientResource = {
  [KeyWithPrefix in keyof Resource as KeyWithPrefix extends `${ClientPrefix}${string}`
    ? KeyWithPrefix extends `${ClientPrefix}${infer KeyWithoutPrefix}`
      ? KeyWithoutPrefix
      : never
    : never]: Resource[KeyWithPrefix];
};

import type { Resource } from "sst";

export const ClientPrefix = "Client";

export type ClientPrefixType = typeof ClientPrefix;
export type ClientResourceType = {
  [KeyWithPrefix in keyof Resource as KeyWithPrefix extends `${ClientPrefixType}${string}`
    ? KeyWithPrefix extends `${ClientPrefixType}${infer KeyWithoutPrefix}`
      ? KeyWithoutPrefix
      : never
    : never]: Resource[KeyWithPrefix];
};

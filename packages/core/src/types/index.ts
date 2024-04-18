import type { Resource } from "sst";
import type { CLIENT_RESOURCE_PREFIX } from "../constants";

export type ClientPrefixType = typeof CLIENT_RESOURCE_PREFIX;
export type ClientResourceType = {
  [KeyWithPrefix in keyof Resource as KeyWithPrefix extends `${ClientPrefixType}${string}`
    ? KeyWithPrefix extends `${ClientPrefixType}${infer KeyWithoutPrefix}`
      ? KeyWithoutPrefix
      : never
    : never]: Resource[KeyWithPrefix];
};

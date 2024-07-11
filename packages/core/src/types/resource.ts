import type { Resource } from "sst";
import type { CLIENT_RESOURCE_PREFIX } from "../constants";

export type ClientPrefix = typeof CLIENT_RESOURCE_PREFIX;
export type ClientResource = {
  [KeyWithPrefix in keyof Resource as KeyWithPrefix extends `${ClientPrefix}${string}`
    ? KeyWithPrefix extends `${ClientPrefix}${infer KeyWithoutPrefix}`
      ? KeyWithoutPrefix
      : never
    : never]: Resource[KeyWithPrefix];
};

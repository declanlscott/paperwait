import { createContext } from "@paperwait/core/utils/context";
import { parseResource } from "@paperwait/core/utils/helpers";

import type { Resource } from "sst";

export type CustomResource = {
  [TKey in keyof Pick<
    Resource,
    | "AppData"
    | "Code"
    | "Cloud"
    | "PulumiBackendBucket"
    | "Realtime"
    | "WebOutputs"
  >]: Omit<Resource[TKey], "type">;
};

export type ResourceContext = CustomResource;
export const ResourceContext = createContext<ResourceContext>("Resource");

export const useResource = ResourceContext.use;

export const withResource = <TCallback extends () => ReturnType<TCallback>>(
  callback: TCallback,
) =>
  ResourceContext.with(
    parseResource<CustomResource>("CUSTOM_RESOURCE_"),
    callback,
  );

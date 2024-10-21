import { Utils } from "@paperwait/core/utils";

import type { Resource } from "sst";

export type CustomResource = {
  [TKey in keyof Pick<Resource, "AppData">]: Omit<Resource[TKey], "type">;
};

export type ResourceContext = CustomResource;
export const ResourceContext = Utils.createContext<ResourceContext>("Resource");

export const useResource = ResourceContext.use;

export const withResource = <TCallback extends () => ReturnType<TCallback>>(
  callback: TCallback,
) =>
  ResourceContext.with(
    Utils.parseResource<CustomResource>("CUSTOM_RESOURCE_", process.env),
    callback,
  );

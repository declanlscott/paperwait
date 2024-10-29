import { Utils } from "@paperwait/core/utils";
import * as pulumi from "@pulumi/pulumi";

import type { Resource } from "sst";

export const resourcePrefix = "CUSTOM_RESOURCE_";

export type CustomResource = {
  [TKey in keyof Pick<
    Resource,
    | "AppData"
    | "Code"
    | "Cloud"
    | "CloudfrontPublicKey"
    | "PulumiBucket"
    | "Realtime"
    | "UserSync"
    | "Web"
  >]: Omit<Resource[TKey], "type">;
};

export type ResourceContext = CustomResource;
export const ResourceContext = Utils.createContext<ResourceContext>("Resource");

export const useResource = ResourceContext.use;

export const withResource = <TCallback extends () => ReturnType<TCallback>>(
  callback: TCallback,
) =>
  ResourceContext.with(
    Utils.parseResource<CustomResource>(resourcePrefix, process.env),
    callback,
  );

export const link = (...params: Parameters<typeof injectLinkables>) => ({
  environment: {
    variables: injectLinkables(...params),
  },
});

export const injectLinkables = (
  linkables: {
    [TKey in keyof Resource]?: pulumi.Input<Record<string, unknown>>;
  },
  prefix = resourcePrefix,
) =>
  Object.entries(linkables).reduce(
    (vars, [name, props]) => {
      vars[`${prefix}${name}`] = pulumi.jsonStringify(pulumi.output(props));

      return vars;
    },
    {} as Record<string, pulumi.Output<string>>,
  );

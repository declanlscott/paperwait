import { Ssm } from "@paperwait/core/aws/ssm";
import { Utils } from "@paperwait/core/utils";
import * as v from "valibot";

import type { Resource } from "sst";

export type CustomResource = {
  [TKey in keyof Pick<
    Resource,
    "AppData" | "Code" | "Cloud" | "PulumiBucket" | "Realtime" | "WebOutputs"
  >]: Omit<Resource[TKey], "type">;
};

export type ResourceContext = CustomResource;
export const ResourceContext = Utils.createContext<ResourceContext>("Resource");

export const useResource = ResourceContext.use;

const ssm = new Ssm.Client();
const cryptoParameter = await Ssm.getParameter(ssm, {
  Name: "/paperwait/crypto/custom-resource",
  WithDecryption: true,
});
const crypto = v.parse(
  v.object({ key: v.string(), iv: v.string() }),
  cryptoParameter,
);

export const withResource = <TCallback extends () => ReturnType<TCallback>>(
  callback: TCallback,
) =>
  ResourceContext.with(
    Utils.parseResource<CustomResource>(
      "CUSTOM_RESOURCE_",
      process.env,
      crypto,
    ),
    callback,
  );

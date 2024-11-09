import { Utils } from "@printworks/core/utils";
import { Ssm } from "@printworks/core/utils/aws";

import type { Context as LambdaContext } from "aws-lambda";
import type { Resource } from "sst";

export type Context = {
  lambda: LambdaContext;
  resource: {
    [TKey in keyof Pick<Resource, "AppData" | "Realtime">]: Omit<
      Resource[TKey],
      "type"
    >;
  };
  ssm: Ssm.Client;
};
export const Context = Utils.createContext<Context>("Context");

export const useContext = Context.use;

export const withContext = <TCallback extends () => ReturnType<TCallback>>(
  lambdaContext: LambdaContext,
  callback: TCallback,
) =>
  Context.with(
    {
      lambda: lambdaContext,
      resource: Utils.parseResource<Context["resource"]>(
        "CUSTOM_RESOURCE_",
        process.env,
      ),
      ssm: new Ssm.Client(),
    },
    callback,
  );

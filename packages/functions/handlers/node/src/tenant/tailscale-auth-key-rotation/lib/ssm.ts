import { Utils } from "@paperwait/core/utils";
import { Ssm } from "@paperwait/core/utils/aws";

export type SsmContext = Ssm.Client;
export const SsmContext = Utils.createContext<SsmContext>("Ssm");

export const useSsm = SsmContext.use;

export const withSsm = <TCallback extends () => ReturnType<TCallback>>(
  callback: TCallback,
) => SsmContext.with(new Ssm.Client(), callback);

import type { WriteTransaction } from "replicache";
import type * as v from "valibot";
import type { Authenticated } from "../auth";
import type { MutationName } from "./shared";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type OptimisticMutator<TSchema extends v.GenericSchema> = (
  tx: WriteTransaction,
  args: v.InferOutput<TSchema>,
) => Promise<void>;

export type AuthenticatedOptimisticMutator<
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  TSchema extends v.GenericSchema = any,
> = (user: Authenticated["user"]) => OptimisticMutator<TSchema>;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type OptimisticMutatorFactory<TSchema extends v.GenericSchema = any> =
  Record<MutationName, OptimisticMutator<TSchema>>;

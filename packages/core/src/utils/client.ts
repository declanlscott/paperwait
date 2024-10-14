import * as v from "valibot";

import type { WriteTransaction } from "replicache";
import type { Authenticated } from "../auth";
import type { OptimisticMutator } from "../replicache/client";

export function getUserInitials(name: string) {
  if (!name) return "";

  const splitName = name.split(" ");
  const firstInitial = splitName[0].charAt(0).toUpperCase();

  if (splitName.length === 1) return firstInitial;

  const lastInitial = splitName[splitName.length - 1].charAt(0).toUpperCase();

  return `${firstInitial}${lastInitial}`;
}

export const optimisticMutator =
  <
    TSchema extends v.GenericSchema,
    TAuthorizer extends (
      user: Authenticated["user"],
      tx: WriteTransaction,
      args: v.InferOutput<TSchema>,
    ) => ReturnType<TAuthorizer>,
    TMutator extends OptimisticMutator<TSchema>,
  >(
    schema: TSchema,
    authorizer: TAuthorizer,
    getMutator: (context: {
      user: Authenticated["user"];
      authorized: Awaited<ReturnType<TAuthorizer>>;
    }) => TMutator,
  ) =>
  (user: Authenticated["user"]) =>
  async (tx: WriteTransaction, args: v.InferInput<TSchema>) => {
    const values = v.parse(schema, args);

    const authorized = await Promise.resolve(authorizer(user, tx, values));

    const mutator = getMutator({ user, authorized });

    return mutator(tx, values);
  };

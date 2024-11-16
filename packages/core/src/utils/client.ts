import * as v from "valibot";

import type { WriteTransaction } from "replicache";
import type { Replicache } from "../replicache/client";
import type { Authenticated } from "../sessions/shared";

export namespace Utils {
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
        tx: WriteTransaction,
        user: Authenticated["user"],
        args: v.InferOutput<TSchema>,
      ) => ReturnType<TAuthorizer>,
      TMutator extends Replicache.OptimisticMutator<TSchema>,
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

      const authorized = await Promise.resolve(authorizer(tx, user, values));

      const mutator = getMutator({ user, authorized });

      return mutator(tx, values);
    };
}

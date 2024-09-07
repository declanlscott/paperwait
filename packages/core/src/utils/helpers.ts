import { customAlphabet } from "nanoid";
import * as v from "valibot";

import { NANOID_CUSTOM_ALPHABET, NANOID_LENGTH } from "../constants";

import type { WriteTransaction } from "replicache";
import type { Authenticated } from "../auth";
import type { HttpError } from "../errors/http";
import type { OptimisticMutator } from "../replicache/client";

export const generateId = customAlphabet(NANOID_CUSTOM_ALPHABET, NANOID_LENGTH);

export const fn =
  <
    TSchema extends v.GenericSchema,
    TCallback extends (output: v.InferOutput<TSchema>) => ReturnType<TCallback>,
    TError extends HttpError,
  >(
    schema: TSchema,
    callback: TCallback,
    customHttpError?: {
      Error: new (message?: string, statusCode?: number) => TError;
      message?: string;
    },
  ) =>
  (input: unknown) => {
    let output: v.InferOutput<TSchema>;
    try {
      output = v.parse(schema, input);
    } catch (e) {
      if (v.isValiError(e) && customHttpError)
        throw new customHttpError.Error(customHttpError.message ?? e.message);

      throw e;
    }

    return callback(output);
  };

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

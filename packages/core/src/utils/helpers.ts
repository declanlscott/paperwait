import {
  joseAlgorithmHS256,
  JWSRegisteredHeaders,
  JWTClaims,
  parseJWT,
} from "@oslojs/jwt";
import { customAlphabet } from "nanoid";
import * as R from "remeda";
import * as v from "valibot";

import { NANOID_CUSTOM_ALPHABET, NANOID_LENGTH } from "../constants";

import type { WriteTransaction } from "replicache";
import type { Authenticated } from "../auth";
import type { OptimisticMutator } from "../replicache/client";
import type {
  AnyError,
  CustomError,
  InferCustomError,
  PrefixedRecord,
} from "./types";

export const generateId = customAlphabet(NANOID_CUSTOM_ALPHABET, NANOID_LENGTH);

export const fn =
  <
    TSchema extends v.GenericSchema,
    TCallback extends (output: v.InferOutput<TSchema>) => ReturnType<TCallback>,
    TMaybeError extends AnyError | undefined,
  >(
    schema: TSchema,
    callback: TCallback,
    customError?: TMaybeError extends AnyError
      ? InferCustomError<CustomError<TMaybeError>>
      : never,
  ) =>
  (input: unknown) => {
    let output: v.InferOutput<TSchema>;
    try {
      output = v.parse(schema, input);
    } catch (e) {
      if (v.isValiError<TSchema>(e) && customError)
        // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
        throw new customError.Error(...customError.args);

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

export function createPrefixedRecord<
  TKey extends string,
  TDelimiter extends string,
  TPrefix extends string,
>(
  prefix: TPrefix,
  delimiter: TDelimiter,
  keys: Array<TKey>,
): PrefixedRecord<TPrefix, TDelimiter, TKey> {
  return keys.reduce(
    (prefixedRecord, key) => {
      prefixedRecord[key] = `${prefix}${delimiter}${key}`;

      return prefixedRecord;
    },
    {} as PrefixedRecord<TPrefix, TDelimiter, TKey>,
  );
}

export function getUserInitials(name: string) {
  if (!name) return "";

  const splitName = name.split(" ");
  const firstInitial = splitName[0].charAt(0).toUpperCase();

  if (splitName.length === 1) return firstInitial;

  const lastInitial = splitName[splitName.length - 1].charAt(0).toUpperCase();

  return `${firstInitial}${lastInitial}`;
}

export const isUniqueByName = <TInput extends Array<{ name: string }>>(
  input: TInput,
) =>
  R.pipe(
    input,
    R.uniqueBy(({ name }) => name),
    R.length(),
    R.isDeepEqual(input.length),
  );

export const formatPascalCase = (value: string) =>
  value.replace(/([a-z])([A-Z])/g, "$1 $2");

export async function parseJwt(jwt: string) {
  const [header, payload] = parseJWT(jwt);

  const headerParameters = new JWSRegisteredHeaders(header);
  if (headerParameters.algorithm() !== joseAlgorithmHS256)
    throw new Error("Unsupported algorithm");

  const claims = new JWTClaims(payload);
  if (claims.hasExpiration() && !claims.verifyExpiration())
    throw new Error("Expired token");
  if (claims.hasNotBefore() && !claims.verifyNotBefore())
    throw new Error("Invalid token");

  return payload;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function parseResource<TResource extends Record<string, any>>(
  prefix = "SST_RESOURCE_",
  input: Record<string, string | undefined> = process.env,
): TResource {
  const raw = Object.entries(input).reduce(
    (raw, [key, value]) => {
      if (key.startsWith(prefix) && value)
        raw[key.slice(prefix.length)] = JSON.parse(value);

      return raw;
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    {} as Record<string, any>,
  );

  return new Proxy(raw, {
    get(target, prop: string) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-return
      if (prop in target) return target[prop];

      throw new Error(`Resource "${prop}" not linked.`);
    },
  }) as TResource;
}

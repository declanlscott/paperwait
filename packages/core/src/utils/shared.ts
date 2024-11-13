/**
 * NOTE: This module provides shared utility functions and must remain framework-agnostic.
 * For example it should not depend on sst for linked resources. Other modules in the
 * core package may depend on sst, but this module should not.
 */

import { customAlphabet } from "nanoid";
import * as R from "remeda";
import * as v from "valibot";

import { Constants } from "./constants";

import type { Authenticated } from "../sessions/shared";
import type { UserRole } from "../users/shared";
import type { AnyError, CustomError, InferCustomError } from "./types";

export const generateId = customAlphabet(
  Constants.NANOID_CUSTOM_ALPHABET,
  Constants.NANOID_LENGTH,
);

export const formatPascalCase = (value: string) =>
  value.replace(/([a-z])([A-Z])/g, "$1 $2");

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

export const isUniqueByKey = <
  TKey extends keyof TInput[number],
  TInput extends Array<Record<TKey, string>>,
>(
  key: TKey,
  input: TInput,
) =>
  R.pipe(
    input,
    R.uniqueBy(R.prop(key)),
    R.length(),
    R.isDeepEqual(input.length),
  );

export const nanoIdSchema = v.pipe(
  v.string(),
  v.regex(Constants.NANOID_PATTERN),
);
export type NanoId = v.InferOutput<typeof nanoIdSchema>;

export const timestampsSchema = v.object({
  createdAt: v.pipe(v.string(), v.isoTimestamp()),
  updatedAt: v.pipe(v.string(), v.isoTimestamp()),
  deletedAt: v.nullable(v.pipe(v.string(), v.isoTimestamp())),
});

export const tenantTableSchema = v.object({
  id: nanoIdSchema,
  tenantId: nanoIdSchema,
  ...timestampsSchema.entries,
});

export const papercutAccountIdSchema = v.pipe(
  v.string(),
  v.transform((input) => BigInt(input).toString()),
);

export const costSchema = v.pipe(
  v.union([v.number(), v.pipe(v.string(), v.decimal())]),
  v.transform(Number),
);

type EnforceRbacResult<TMaybeError extends AnyError | undefined> =
  TMaybeError extends AnyError ? true : boolean;

export function enforceRbac<TMaybeError extends AnyError | undefined>(
  user: Authenticated["user"],
  roles: Array<UserRole>,
  customError?: TMaybeError extends AnyError
    ? InferCustomError<CustomError<TMaybeError>>
    : never,
): EnforceRbacResult<TMaybeError> {
  const hasAccess = roles.includes(user.profile.role);

  if (!hasAccess) {
    console.log("Access denied.");

    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    if (customError) throw new customError.Error(...customError.args);
  }

  return hasAccess as EnforceRbacResult<TMaybeError>;
}

export const getBase64UrlEncoded = <TValue extends Record<string, unknown>>(
  input: TValue,
) =>
  btoa(JSON.stringify(input))
    .replace(/\+/g, "-") // Convert '+' to '-'
    .replace(/\//g, "_") // Convert '/' to '_'
    .replace(/=+$/, ""); // Remove padding '='

import { customAlphabet } from "nanoid";
import * as R from "remeda";
import * as v from "valibot";

import {
  NANOID_CUSTOM_ALPHABET,
  NANOID_LENGTH,
  NANOID_PATTERN,
} from "../constants";

import type { AnyError, CustomError, InferCustomError } from "./types";

export const generateId = customAlphabet(NANOID_CUSTOM_ALPHABET, NANOID_LENGTH);

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

export const isUniqueByName = <TInput extends Array<{ name: string }>>(
  input: TInput,
) =>
  R.pipe(
    input,
    R.uniqueBy(({ name }) => name),
    R.length(),
    R.isDeepEqual(input.length),
  );

export const nanoIdSchema = v.pipe(v.string(), v.regex(NANOID_PATTERN));
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

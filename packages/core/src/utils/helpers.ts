import { customAlphabet } from "nanoid";
import * as v from "valibot";

import { NANOID_CUSTOM_ALPHABET, NANOID_LENGTH } from "../constants/patterns";

import type { HttpError } from "../errors/http";

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

    return callback.apply(callback, [output]);
  };

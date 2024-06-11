import * as v from "valibot";

import type { HttpError } from "../errors/http";

export const validate =
  <TSchema extends v.GenericSchema, TError extends HttpError>(
    schema: TSchema,
    customError?: {
      Error: new (message?: string, statusCode?: number) => TError;
      message?: string;
    },
  ) =>
  (input: unknown) => {
    try {
      return v.parse(schema, input);
    } catch (e) {
      if (v.isValiError(e) && customError)
        throw new customError.Error(customError.message ?? e.message);

      throw e;
    }
  };

export const fn =
  <
    TSchema extends v.GenericSchema,
    TCallback extends (output: v.InferOutput<TSchema>) => ReturnType<TCallback>,
    TError extends HttpError,
  >(
    schema: TSchema,
    callback: TCallback,
    customError?: {
      Error: new (message?: string, statusCode?: number) => TError;
      message?: string;
    },
  ) =>
  (input: unknown) => {
    let output: v.InferOutput<TSchema>;
    try {
      output = v.parse(schema, input);
    } catch (e) {
      if (v.isValiError(e) && customError)
        throw new customError.Error(customError.message ?? e.message);

      throw e;
    }

    return callback.apply(callback, [output]);
  };

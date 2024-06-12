import * as v from "valibot";

import type { HttpError } from "../errors/http";

export type CustomError<TError extends HttpError> = {
  Error: new (message?: string, statusCode?: number) => TError;
  message?: string;
};

export const validate = <
  TSchema extends v.GenericSchema,
  TError extends HttpError,
>(
  schema: TSchema,
  input: unknown,
  customError?: CustomError<TError>,
) => validator(schema, customError)(input);

export const validator =
  <TSchema extends v.GenericSchema, TError extends HttpError>(
    schema: TSchema,
    customError?: CustomError<TError>,
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
    customError?: CustomError<TError>,
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

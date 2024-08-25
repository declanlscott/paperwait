import * as v from "valibot";

import type { HttpError } from "../errors/http";

export type CustomHttpError<TError extends HttpError> = {
  Error: new (message?: string, statusCode?: number) => TError;
  message?: string;
};

export const fn =
  <
    TSchema extends v.GenericSchema,
    TCallback extends (output: v.InferOutput<TSchema>) => ReturnType<TCallback>,
    TError extends HttpError,
  >(
    schema: TSchema,
    callback: TCallback,
    customHttpError?: CustomHttpError<TError>,
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

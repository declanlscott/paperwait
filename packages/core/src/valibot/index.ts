import * as v from "valibot";

import type { HttpError } from "../errors/http";

export function validate<
  TSchema extends v.GenericSchema,
  TError extends HttpError,
>(
  schema: TSchema,
  input: unknown,
  customError?: {
    Error: new (message?: string, statusCode?: number) => TError;
    message?: string;
  },
): v.InferOutput<TSchema> {
  const result = v.safeParse(schema, input);

  if (!result.success) {
    console.log(result.issues);

    if (customError)
      throw new customError.Error(
        customError.message ?? "Failed to parse schema",
      );

    throw new Error("Failed to parse schema");
  }

  // eslint-disable-next-line @typescript-eslint/no-unsafe-return
  return result.output;
}

import { safeParse } from "valibot";

import type { BaseSchema, Output } from "valibot";
import type { HttpError } from "../errors";

export function parseSchema<
  TSchema extends BaseSchema,
  TError extends HttpError,
>(
  schema: TSchema,
  input: unknown,
  error?: {
    className: new (message?: string, statusCode?: number) => TError;
    message?: string;
  },
): Output<TSchema> {
  const result = safeParse(schema, input);

  if (!result.success) {
    console.log(result.issues);

    if (error)
      throw new error.className(error.message ?? "Failed to parse schema");

    throw new Error("Failed to parse schema");
  }

  // eslint-disable-next-line @typescript-eslint/no-unsafe-return
  return result.output;
}

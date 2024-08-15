import {
  DB_TRANSACTION_MAX_RETRIES,
  POSTGRES_DEADLOCK_DETECTED_ERROR_CODE,
  POSTGRES_SERIALIZATION_FAILURE_ERROR_CODE,
} from "../constants";
import { InternalServerError } from "../errors/http";
import { db } from "./orm";

import type { ExtractTablesWithRelations } from "drizzle-orm";
import type { NeonQueryResultHKT } from "drizzle-orm/neon-serverless";
import type { PgTransaction, PgTransactionConfig } from "drizzle-orm/pg-core";
import type { PostgresJsQueryResultHKT } from "drizzle-orm/postgres-js";

export type Transaction = PgTransaction<
  NeonQueryResultHKT | PostgresJsQueryResultHKT,
  Record<string, never>,
  ExtractTablesWithRelations<Record<string, never>>
>;

export type TransactionResult<TOutput> =
  | { status: "success"; output: TOutput }
  | { status: "error"; error: unknown; shouldRethrow: boolean };

export async function transact<
  TOutput,
  TOnRollback extends (e: unknown) => boolean | Promise<boolean>,
>(
  callback: (tx: Transaction) => Promise<TOutput>,
  options?: {
    transaction?: PgTransactionConfig;
    onRollback?: TOnRollback;
  },
): Promise<TransactionResult<TOutput>> {
  try {
    const output = await db.transaction(callback, options?.transaction);

    return { status: "success", output };
  } catch (error) {
    console.error(error);

    if (!options?.onRollback)
      return { status: "error", error, shouldRethrow: true };

    const shouldRethrow = await Promise.resolve(options.onRollback(error));

    return { status: "error", error, shouldRethrow };
  }
}

export async function serializable<TOutput>(
  callback: (tx: Transaction) => Promise<TOutput>,
) {
  for (let i = 0; i < DB_TRANSACTION_MAX_RETRIES; i++) {
    const result = await transact(callback, {
      transaction: { isolationLevel: "serializable" },
      onRollback: (e) => {
        if (shouldRetryTransaction(e)) {
          console.log(
            // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
            `Retrying transaction due to error ${e} - attempt number ${i}`,
          );

          return false;
        }

        return true;
      },
    });

    if (result.status === "error") {
      if (result.shouldRethrow) throw result.error;

      continue;
    }

    return result.output;
  }

  throw new InternalServerError(
    "Tried to execute transaction too many times, giving up.",
  );
}

/**
 * Check error code to determine if we should retry a transaction.
 * Because we are using SERIALIZABLE isolation level, we need to be prepared to retry transactions.
 *
 * See https://stackoverflow.com/questions/60339223/node-js-transaction-coflicts-in-postgresql-optimistic-concurrency-control-and, https://www.postgresql.org/docs/10/errcodes-appendix.html and
 * https://stackoverflow.com/a/16409293/749644
 */
function shouldRetryTransaction(error: unknown) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access
  const code = typeof error === "object" ? String((error as any).code) : null;

  return (
    code === POSTGRES_SERIALIZATION_FAILURE_ERROR_CODE ||
    code === POSTGRES_DEADLOCK_DETECTED_ERROR_CODE
  );
}

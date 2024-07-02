import { db } from ".";
import {
  DB_TRANSACTION_MAX_RETRIES,
  POSTGRES_DEADLOCK_DETECTED_ERROR_CODE,
  POSTGRES_SERIALIZATION_FAILURE_ERROR_CODE,
} from "../constants";
import { InternalServerError } from "../errors/http";

import type { ExtractTablesWithRelations } from "drizzle-orm";
import type { NeonQueryResultHKT } from "drizzle-orm/neon-serverless";
import type { PgTransaction, PgTransactionConfig } from "drizzle-orm/pg-core";

export type Transaction = PgTransaction<
  NeonQueryResultHKT,
  Record<string, never>,
  ExtractTablesWithRelations<Record<string, never>>
>;

export async function transact<TResult>(
  callback: (tx: Transaction) => Promise<TResult>,
  isolationLevel: PgTransactionConfig["isolationLevel"] = "serializable",
) {
  for (let i = 0; i < DB_TRANSACTION_MAX_RETRIES; i++) {
    try {
      const result = await db.transaction(callback, { isolationLevel });

      return result;
    } catch (e) {
      if (shouldRetryTransaction(e)) {
        console.log(
          // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
          `Retrying transaction due to error ${e} - attempt number ${i}`,
        );

        continue;
      }

      throw e;
    }
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

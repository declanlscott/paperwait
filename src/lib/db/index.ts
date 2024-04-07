import { isDevEnv } from "~/utils/env";

import type { NeonHttpDatabase } from "drizzle-orm/neon-http";

const sql = isDevEnv
  ? await import("~/lib/db/local")
  : await import("~/lib/db/remote");

// narrow the union type to the remote db type
const db = sql.db as NeonHttpDatabase<Record<string, never>>;
const authAdapter = sql.authAdapter;

export { db, authAdapter };

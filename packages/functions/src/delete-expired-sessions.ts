import { lucia } from "@paperwait/core/auth";

export async function handler() {
  await lucia.deleteExpiredSessions();
}

import { lucia } from "~/lib/server/auth";

export async function handler() {
  await lucia.deleteExpiredSessions();
}

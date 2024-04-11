import { lucia } from "~/lib/auth";

export async function handler() {
  await lucia.deleteExpiredSessions();
}

import { lucia } from "@paperwait/core/auth";

export const handler = () => lucia.deleteExpiredSessions();

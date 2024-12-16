import { withUser } from "@printworks/core/users/context";
import { createMiddleware } from "hono/factory";

export const user = createMiddleware(async (_, next) => withUser(next));

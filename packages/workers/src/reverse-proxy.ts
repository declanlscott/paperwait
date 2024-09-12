import { AUTH_SESSION_COOKIE_NAME } from "@paperwait/core/constants";
import { HttpError, TooManyRequests } from "@paperwait/core/errors/http";
import { Hono } from "hono";
import { getConnInfo } from "hono/cloudflare-workers";
import { getCookie } from "hono/cookie";
import { HTTPException } from "hono/http-exception";

import type { StatusCode } from "hono/utils/http-status";

export default new Hono<{
  Bindings: {
    SESSION_RATE_LIMITER: { limit: (sessionId: string) => Promise<boolean> };
    IP_RATE_LIMITER: { limit: (ip: string) => Promise<boolean> };
  };
}>()
  .use("/api/*", async (c, next) => {
    const sessionId = getCookie(c, AUTH_SESSION_COOKIE_NAME);

    let success: boolean;
    if (sessionId) success = await c.env.SESSION_RATE_LIMITER.limit(sessionId);
    else {
      const ip = getConnInfo(c).remote.address;
      if (!ip) throw new Error("Missing remote address");

      success = await c.env.IP_RATE_LIMITER.limit(ip);
    }
    if (!success) throw new TooManyRequests();

    await next();
  })
  .use("/partials/*", async (c, next) => {
    const ip = getConnInfo(c).remote.address;
    if (!ip) throw new Error("Missing remote address");

    const success = await c.env.IP_RATE_LIMITER.limit(ip);
    if (!success) throw new TooManyRequests();

    await next();
  })
  .all("*", (c) => fetch(c.req.raw))
  .onError((e, c) => {
    console.error(e);

    if (e instanceof HttpError)
      return c.json(e.message, e.statusCode as StatusCode);
    if (e instanceof HTTPException) return e.getResponse();

    return c.json("Internal server error", 500);
  });

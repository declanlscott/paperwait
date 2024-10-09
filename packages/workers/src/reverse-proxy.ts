import { SESSION_COOKIE_NAME } from "@paperwait/core/constants";
import { HttpError, TooManyRequests } from "@paperwait/core/errors/http";
import { Hono } from "hono";
import { getConnInfo } from "hono/cloudflare-workers";
import { getCookie } from "hono/cookie";
import { HTTPException } from "hono/http-exception";

import type { RateLimit } from "@cloudflare/workers-types";
import type { StatusCode } from "hono/utils/http-status";

export default new Hono<{
  Bindings: {
    SESSION_RATE_LIMITER: RateLimit;
    IP_RATE_LIMITER: RateLimit;
  };
}>()
  .use("/api/*", async (c, next) => {
    const sessionId = getCookie(c, SESSION_COOKIE_NAME);

    let outcome: RateLimitOutcome;
    if (sessionId)
      outcome = await c.env.SESSION_RATE_LIMITER.limit({ key: sessionId });
    else {
      const ip = getConnInfo(c).remote.address;
      if (!ip) throw new Error("Missing remote address");

      outcome = await c.env.IP_RATE_LIMITER.limit({ key: ip });
    }
    if (!outcome.success) throw new TooManyRequests();

    await next();
  })
  .use("/partials/*", async (c, next) => {
    const ip = getConnInfo(c).remote.address;
    if (!ip) throw new Error("Missing remote address");

    const outcome = await c.env.IP_RATE_LIMITER.limit({ key: ip });
    if (!outcome.success) throw new TooManyRequests();

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

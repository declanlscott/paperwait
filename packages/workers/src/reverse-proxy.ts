import { lucia } from "@paperwait/core/auth";
import { HttpError, TooManyRequestsError } from "@paperwait/core/errors/http";
import { Hono } from "hono";
import { getConnInfo } from "hono/cloudflare-workers";
import { getCookie } from "hono/cookie";
import { HTTPException } from "hono/http-exception";

export default new Hono<{
  Bindings: {
    SESSION_RATE_LIMITER: (sessionId: string) => Promise<boolean>;
    IP_RATE_LIMITER: (ip: string) => Promise<boolean>;
  };
}>()
  .use(async (c, next) => {
    if (c.req.path.startsWith("/api")) {
      const sessionId = getCookie(c, lucia.sessionCookieName);
      if (sessionId) {
        const success = await c.env.SESSION_RATE_LIMITER(sessionId);
        if (!success) throw new TooManyRequestsError();
      } else {
        const ip = getConnInfo(c).remote.address;
        if (!ip) throw new Error("Missing remote address");

        const success = await c.env.IP_RATE_LIMITER(ip);
        if (!success) throw new TooManyRequestsError();
      }
    }

    if (c.req.path.startsWith("/partials")) {
      const ip = getConnInfo(c).remote.address;
      if (!ip) throw new Error("Missing remote address");

      const success = await c.env.IP_RATE_LIMITER(ip);
      if (!success) throw new TooManyRequestsError();
    }

    await next();
  })
  .all("*", (c) => fetch(c.req.raw))
  .onError((e, c) => {
    console.error(e);

    if (e instanceof HttpError)
      return c.json(e.message, { status: e.statusCode });
    if (e instanceof HTTPException) return e.getResponse();

    return c.json("Internal server error", { status: 500 });
  });

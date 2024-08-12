import { defineMiddleware } from "astro:middleware";
import { Resource } from "sst";

import { isPrerenderedPage, rateLimit } from "~/middleware/utils";

export const rateLimitIp = defineMiddleware(async (context, next) => {
  if (Resource.ClientIsDev.value === "true") return await next();

  const path = context.url.pathname;
  if (isPrerenderedPage(path)) return await next();
  if (!path.startsWith("/partials") && !path.startsWith("/org"))
    return await next();

  const { success } = await rateLimit.limit(context.clientAddress);
  if (!success) return new Response("Rate limit exceeded", { status: 429 });

  return await next();
});

export const rateLimitUser = defineMiddleware(async (context, next) => {
  if (Resource.ClientIsDev.value === "true") return await next();

  const { org, user } = context.locals;
  if (!org || !user) return await next();

  const { success } = await rateLimit.limit(`${org.id}:${user.id}`);
  if (!success) return new Response("Rate limit exceeded", { status: 429 });

  return await next();
});

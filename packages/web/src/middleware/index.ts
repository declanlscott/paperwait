import { defineMiddleware, sequence } from "astro:middleware";

import { auth } from "~/middleware/auth";

import type { MiddlewareHandler } from "astro";

const prerenderedPaths = ["/", "/register"];

const isPrerenderedPage = (path: string) => prerenderedPaths.includes(path);

export const onRequest = defineMiddleware((ctx, next) => {
  const handlers: Array<MiddlewareHandler> = [];

  if (!isPrerenderedPage(new URL(ctx.request.url).pathname))
    handlers.push(auth);

  const middleware = sequence(...handlers);

  return middleware(ctx, next);
});

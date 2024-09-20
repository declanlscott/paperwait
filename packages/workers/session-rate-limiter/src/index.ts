import { WorkerEntrypoint } from "cloudflare:workers";

import type { RateLimit, RateLimitOptions } from "@cloudflare/workers-types";

export default class extends WorkerEntrypoint<{
  SESSION_RATE_LIMITER: RateLimit;
}> {
  fetch = async () => new Response("Healthy!");

  limit = async (options: RateLimitOptions) =>
    this.env.SESSION_RATE_LIMITER.limit(options);
}

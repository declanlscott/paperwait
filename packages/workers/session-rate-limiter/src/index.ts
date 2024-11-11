import { WorkerEntrypoint } from "cloudflare:workers";

import type { RateLimit, RateLimitOptions } from "@cloudflare/workers-types";

export default class extends WorkerEntrypoint<{
  SESSION_RATE_LIMITER: RateLimit;
}> {
  fetch() {
    return new Response("Healthy!");
  }

  async limit(options: RateLimitOptions) {
    return this.env.SESSION_RATE_LIMITER.limit(options);
  }
}

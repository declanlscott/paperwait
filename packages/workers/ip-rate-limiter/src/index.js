import { WorkerEntrypoint } from "cloudflare:workers";

export default class extends WorkerEntrypoint {
  async fetch() {
    return new Response("Healthy!");
  }

  async limit(key) {
    const { success } = await this.env.IP_RATE_LIMITER.limit({ key });

    return success;
  }
}

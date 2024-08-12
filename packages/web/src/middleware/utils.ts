import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { Resource } from "sst";

export const redis = new Redis({
  url: `https://${Resource.Redis.endpoint}`,
  token: Resource.Redis.restToken,
});

export const rateLimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(10, "10 s"),
});

export const isPrerenderedPage = (path: string) =>
  path === "/" || path === "/register";

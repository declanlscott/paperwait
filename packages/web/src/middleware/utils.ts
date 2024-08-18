import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { Resource } from "sst";

export const redis = new Redis({
  url: `https://${Resource.Db.redis.endpoint}`,
  token: Resource.Db.redis.restToken,
});

export const rateLimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(10, "10 s"),
});

export const isPrerenderedPage = (path: string) =>
  path === "/" || path === "/register";

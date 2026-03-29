import { Ratelimit } from "@upstash/ratelimit";
import { kv } from "@vercel/kv";

// Create a new ratelimiter that allows 3 requests per 24 hours
export const ratelimit = new Ratelimit({
  redis: kv,
  limiter: Ratelimit.slidingWindow(3, "24 h"),
  analytics: true,
  prefix: "@upstash/ratelimit/timetable",
});

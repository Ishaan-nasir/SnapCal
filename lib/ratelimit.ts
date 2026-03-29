import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

// Explicitly pointing to the environment variables shown in our Vercel dashboard
export const ratelimit = new Ratelimit({
  redis: new Redis({
    url: process.env.KV_REST_API_URL || "",
    token: process.env.KV_REST_API_TOKEN || "",
  }),
  limiter: Ratelimit.slidingWindow(3, "24 h"),
  prefix: "@upstash/ratelimit/snapcal",
});

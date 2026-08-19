import { redis } from "../database/redis.js";
import { env } from "../config/env.js";

export interface SendSlot {
  allowed: boolean;
  retryAt: number | null;
}

const MIN_SEND_KEY = "email-throttle:next-send";

export async function acquireSendSlot(): Promise<SendSlot> {
  const now = Date.now();
  const delay = Math.max(env.MIN_SEND_DELAY_MS, 0);

  const result = await redis.eval(
    `
      local key = KEYS[1]
      local now = tonumber(ARGV[1])
      local interval = tonumber(ARGV[2])

      local current = redis.call("GET", key)

      if not current or tonumber(current) <= now then
        local next = now + interval
        redis.call("SET", key, next, "PX", interval * 2)
        return {1, next}
      end

      return {0, tonumber(current)}
    `,
    1,
    MIN_SEND_KEY,
    now,
    delay,
  ) as [number, number];

  if (result[0] === 1) {
    return {
      allowed: true,
      retryAt: null,
    };
  }

  return {
    allowed: false,
    retryAt: result[1],
  };
}

export async function consumeHourlyLimit(
  sender: string,
): Promise<SendSlot> {
  const now = Date.now();
  const hourStart = Math.floor(now / 3_600_000) * 3_600_000;
  const key = `email-rate:${sender}:${hourStart}`;

  const count = await redis.incr(key);

  if (count === 1) {
    await redis.pexpire(key, 3_600_000);
  }

  if (count <= env.MAX_EMAILS_PER_HOUR) {
    return {
      allowed: true,
      retryAt: null,
    };
  }

  await redis.decr(key);

  return {
    allowed: false,
    retryAt: hourStart + 3_600_000,
  };
}

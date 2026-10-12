interface RateLimitRecord {
  count: number;
  resetAt: number;
}

// In-memory tracker storing IP addresses and their attempt counts
const tracker = new Map<string, RateLimitRecord>();

// Clean up expired IP records every 5 minutes to prevent memory leaks
setInterval(
  () => {
    const now = Date.now();
    for (const [key, record] of tracker.entries()) {
      if (now > record.resetAt) {
        tracker.delete(key);
      }
    }
  },
  1000 * 60 * 5,
);

export function rateLimit({
  key,
  limit = 5,
  windowMs = 60 * 1000,
}: {
  key: string;
  limit?: number;
  windowMs?: number;
}) {
  const now = Date.now();
  const record = tracker.get(key);

  // If no record or window expired, start a fresh window
  if (!record || now > record.resetAt) {
    tracker.set(key, { count: 1, resetAt: now + windowMs });
    return { success: true, remaining: limit - 1, resetInSeconds: Math.ceil(windowMs / 1000) };
  }

  // If over limit, block the request
  if (record.count >= limit) {
    const resetInSeconds = Math.ceil((record.resetAt - now) / 1000);
    return { success: false, remaining: 0, resetInSeconds };
  }

  // Increment attempt count
  record.count += 1;
  const resetInSeconds = Math.ceil((record.resetAt - now) / 1000);
  return { success: true, remaining: limit - record.count, resetInSeconds };
}

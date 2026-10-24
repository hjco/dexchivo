export interface ThrottleDecision {
  allowed: boolean;
  retryAfterSeconds: number;
}

interface AttemptWindow {
  count: number;
  startedAt: number;
}

/**
 * Process-local login throttle. The deployment in M1 is a single API process,
 * so this is sufficient; a multi-instance deployment must move this to Redis.
 */
export class LoginThrottle {
  private readonly attempts = new Map<string, AttemptWindow>();
  private readonly maxAttempts: number;
  private readonly windowMs: number;
  private readonly now: () => number;

  constructor(options: { maxAttempts: number; windowMs: number; now?: () => number }) {
    this.maxAttempts = options.maxAttempts;
    this.windowMs = options.windowMs;
    this.now = options.now ?? Date.now;
  }

  check(key: string): ThrottleDecision {
    const now = this.now();
    const window = this.attempts.get(key);
    if (!window || now - window.startedAt >= this.windowMs) {
      if (window) {
        this.attempts.delete(key);
      }
      return { allowed: true, retryAfterSeconds: 0 };
    }

    if (window.count < this.maxAttempts) {
      return { allowed: true, retryAfterSeconds: 0 };
    }

    return {
      allowed: false,
      retryAfterSeconds: Math.max(1, Math.ceil((window.startedAt + this.windowMs - now) / 1000)),
    };
  }

  recordFailure(key: string): void {
    const now = this.now();
    const window = this.attempts.get(key);
    if (!window || now - window.startedAt >= this.windowMs) {
      this.attempts.set(key, { count: 1, startedAt: now });
      return;
    }

    window.count += 1;
  }

  reset(key: string): void {
    this.attempts.delete(key);
  }

  /** Remove expired keys so a long-running process does not grow without bound. */
  prune(): void {
    const now = this.now();
    for (const [key, window] of this.attempts) {
      if (now - window.startedAt >= this.windowMs) {
        this.attempts.delete(key);
      }
    }
  }

  get size(): number {
    return this.attempts.size;
  }
}

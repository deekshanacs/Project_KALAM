interface AttemptRecord {
  count: number;
  lockedUntil: Date | null;
  lastAttempt: Date;
}

const MAX_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 minutes
const STALE_THRESHOLD_MS = 30 * 60 * 1000; // 30 minutes

class LoginAttemptTracker {
  private readonly attempts = new Map<string, AttemptRecord>();

  isLocked(email: string): boolean {
    const record = this.attempts.get(email.toLowerCase());
    if (!record?.lockedUntil) return false;
    if (record.lockedUntil > new Date()) return true;
    this.attempts.delete(email.toLowerCase());
    return false;
  }

  getRemainingLockSeconds(email: string): number {
    const record = this.attempts.get(email.toLowerCase());
    if (!record?.lockedUntil) return 0;
    return Math.max(0, Math.ceil((record.lockedUntil.getTime() - Date.now()) / 1000));
  }

  recordFailure(email: string): void {
    const key = email.toLowerCase();
    const existing = this.attempts.get(key);
    const count = (existing?.count ?? 0) + 1;

    this.attempts.set(key, {
      count,
      lockedUntil: count >= MAX_ATTEMPTS ? new Date(Date.now() + LOCKOUT_DURATION_MS) : null,
      lastAttempt: new Date(),
    });
  }

  reset(email: string): void {
    this.attempts.delete(email.toLowerCase());
  }

  cleanup(): void {
    const now = Date.now();
    for (const [key, record] of this.attempts.entries()) {
      if (record.lastAttempt.getTime() + STALE_THRESHOLD_MS < now) {
        this.attempts.delete(key);
      }
    }
  }
}

export const loginAttemptTracker = new LoginAttemptTracker();

// Cleanup stale records every 30 minutes
setInterval(() => loginAttemptTracker.cleanup(), STALE_THRESHOLD_MS);

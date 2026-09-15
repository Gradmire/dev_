import "server-only";
import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

/**
 * Single-use tokens for links we email to someone who is not signed in —
 * the parental consent link, and the newsletter unsubscribe link.
 *
 * 32 bytes of CSPRNG output, base64url so it survives a URL without
 * escaping. Only the SHA-256 hash is stored, for the same reason a password
 * is not stored in plaintext: a leaked backup of `parental_consent_requests`
 * must not let the reader consent as somebody's parent.
 *
 * No salt or key-stretching, deliberately. Those defend a low-entropy secret
 * against an offline guessing attack; 256 bits of randomness has nothing to
 * guess, and a slow KDF here would only slow down the legitimate lookup.
 */
export function generateToken(): string {
  return randomBytes(32).toString("base64url");
}

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/**
 * Compares two token hashes without leaking, through timing, how much of a
 * candidate matched. The database lookup is by hash so this is belt and
 * braces, but it costs nothing and the one place it matters is cheap to miss.
 */
export function tokenHashEquals(a: string, b: string): boolean {
  const bufA = Buffer.from(a, "utf8");
  const bufB = Buffer.from(b, "utf8");
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

/** Parental consent links expire; an indefinitely valid one is a standing key. */
export const PARENTAL_CONSENT_TTL_HOURS = 72;

export function expiryFromNow(hours: number, from: Date = new Date()): Date {
  return new Date(from.getTime() + hours * 60 * 60 * 1000);
}

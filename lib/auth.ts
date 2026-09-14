import { createHash, createHmac, randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { requiredConfig } from "@/lib/config";

/**
 * The whole of the authentication logic: the configured account, password
 * verification, and the signed session cookie. Pages call this module and nothing
 * else — no page reads a cookie or checks a signature on its own.
 */

/** The cookie holding the signed session token. */
const SESSION_COOKIE = "session";

/** How long an issued session stays valid. */
const SESSION_LIFETIME_MS = 8 * 60 * 60 * 1000;

/** Length of a scrypt key, in bytes. */
const KEY_LENGTH = 64;

export type Session = {
  /** The account the session was issued for. */
  account: string;
  /** When the session stops being valid, in milliseconds since the epoch. */
  expiresAt: number;
};

/**
 * Checks a submitted account and password against the configured ones. Both
 * comparisons run in constant time, and the password is hashed with a fresh random
 * salt on every check.
 */
export async function verifyCredentials(account: string, password: string): Promise<boolean> {
  const configured = requiredConfig();
  const salt = randomBytes(16);
  const [expected, submitted] = await Promise.all([
    scrypt(configured.password, salt),
    scrypt(password, salt),
  ]);

  const passwordMatches = timingSafeEqual(expected, submitted);
  const accountMatches = timingSafeEqual(digest(account), digest(configured.account));

  return passwordMatches && accountMatches;
}

/** Issues a session token: the account and an expiry, signed with the secret. */
export function createSessionToken(account: string): string {
  const payload = Buffer.from(
    JSON.stringify({ account, expiresAt: Date.now() + SESSION_LIFETIME_MS } satisfies Session),
  ).toString("base64url");

  return `${payload}.${sign(payload)}`;
}

/** Reads a session token back, refusing one this server did not sign or that has expired. */
export function verifySessionToken(token: string): Session | null {
  const [payload, signature] = token.split(".");
  if (!payload || !signature) return null;

  const expected = Buffer.from(sign(payload));
  const submitted = Buffer.from(signature);
  if (expected.length !== submitted.length || !timingSafeEqual(expected, submitted)) return null;

  const session = parsePayload(payload);
  if (!session || session.expiresAt <= Date.now()) return null;

  return session;
}

/** The session of the current visitor, or null while signed out. */
export async function currentSession(): Promise<Session | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;

  return token ? verifySessionToken(token) : null;
}

/**
 * Signs a visitor in: checks the credentials and, when they match, issues the
 * session cookie for the configured account. Answers false when they do not.
 */
export async function signIn(account: string, password: string): Promise<boolean> {
  if (!(await verifyCredentials(account, password))) return false;

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, createSessionToken(requiredConfig().account), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
  });

  return true;
}

function sign(payload: string): string {
  return createHmac("sha256", requiredConfig().sessionSecret).update(payload).digest("base64url");
}

function scrypt(value: string, salt: Buffer): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scryptCallback(value, salt, KEY_LENGTH, (error, derivedKey) => {
      if (error) reject(error);
      else resolve(derivedKey);
    });
  });
}

/** Fixed-length digest, so two values of different lengths still compare in constant time. */
function digest(value: string): Buffer {
  return createHash("sha256").update(value).digest();
}

function parsePayload(payload: string): Session | null {
  try {
    const parsed: unknown = JSON.parse(Buffer.from(payload, "base64url").toString());
    if (typeof parsed !== "object" || parsed === null) return null;

    const { account, expiresAt } = parsed as Partial<Session>;
    if (typeof account !== "string" || typeof expiresAt !== "number") return null;

    return { account, expiresAt };
  } catch {
    return null;
  }
}

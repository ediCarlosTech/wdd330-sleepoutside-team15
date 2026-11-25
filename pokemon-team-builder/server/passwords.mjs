import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const scryptAsync = promisify(scrypt);

// scrypt settings (OWASP lists N=2^15, r=8, p=3 as a safe minimum).
// They are stored with each hash, so they can be raised later without
// locking anyone out.
const COST = { N: 2 ** 15, r: 8, p: 3 };
const KEY_LENGTH = 64;
// scrypt needs about 128 * N * r bytes, so allow some headroom
const MAX_MEMORY = 128 * 1024 * 1024;

function derive(password, salt, { N, r, p }, length) {
  return scryptAsync(password, salt, length, { N, r, p, maxmem: MAX_MEMORY });
}

// "scrypt$N$r$p$salt$key", with the salt and key in base64
export async function hashPassword(password) {
  const salt = randomBytes(16);
  const key = await derive(password, salt, COST, KEY_LENGTH);
  return `scrypt$${COST.N}$${COST.r}$${COST.p}$${salt.toString("base64")}$${key.toString("base64")}`;
}

export async function verifyPassword(password, stored) {
  const [scheme, n, r, p, saltText, keyText] = String(stored).split("$");
  if (scheme !== "scrypt" || !saltText || !keyText) {
    return false;
  }
  const cost = { N: Number(n), r: Number(r), p: Number(p) };
  // Only accept settings in a sane range. The stored text is ours, but a
  // damaged row should fail quietly instead of throwing or hogging the CPU.
  const sane =
    Number.isInteger(Math.log2(cost.N)) &&
    cost.N >= 2 &&
    cost.N <= 2 ** 20 &&
    Number.isInteger(cost.r) &&
    cost.r >= 1 &&
    cost.r <= 16 &&
    Number.isInteger(cost.p) &&
    cost.p >= 1 &&
    cost.p <= 16;
  const expected = Buffer.from(keyText, "base64");
  if (!sane || expected.length < 16) {
    return false;
  }

  try {
    const actual = await derive(
      password,
      Buffer.from(saltText, "base64"),
      cost,
      expected.length,
    );
    // timingSafeEqual avoids leaking how many leading bytes matched
    return (
      actual.length === expected.length && timingSafeEqual(actual, expected)
    );
  } catch (err) {
    return false;
  }
}

// A hash nobody has the password for. Logging in as a name that does not exist
// still does this work, so the response time doesn't reveal which names exist.
let dummyHash;
export function getDummyHash() {
  dummyHash ??= hashPassword(randomBytes(16).toString("hex"));
  return dummyHash;
}

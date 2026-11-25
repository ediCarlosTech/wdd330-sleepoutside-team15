import { createPublicKey, createVerify } from "node:crypto";

// Checks the "ID token" that Google's sign-in button hands to the page.
// An ID token is a signed JWT. Trusting it means checking three things: the
// signature matches one of Google's published keys, it was issued by Google,
// and it was issued for THIS app (the audience is our client ID). Without the
// audience check, a token Google issued to some other app would work here.

const ISSUERS = new Set(["https://accounts.google.com", "accounts.google.com"]);
const KEYS_URL = "https://www.googleapis.com/oauth2/v3/certs";
const CLOCK_SKEW_MS = 60 * 1000;
const DEFAULT_KEY_LIFETIME_S = 3600;
// an unknown key id triggers a refetch (Google rotates keys), at most this often
const MIN_REFETCH_MS = 60 * 1000;

// Returns getKey(kid): the public key (as a JWK) with that id. The list is
// cached for as long as Google says it may be.
export function createKeyFetcher({ fetchFn = fetch, now = Date.now } = {}) {
  let keys = [];
  let expiresAt = 0;
  let fetchedAt = 0;

  async function refresh() {
    const response = await fetchFn(KEYS_URL);
    if (!response.ok) {
      throw new Error("Could not load Google's signing keys.");
    }
    const body = await response.json();
    const maxAge = /max-age=(\d+)/.exec(
      response.headers?.get?.("cache-control") ?? "",
    )?.[1];
    keys = Array.isArray(body.keys) ? body.keys : [];
    fetchedAt = now();
    expiresAt = fetchedAt + (Number(maxAge) || DEFAULT_KEY_LIFETIME_S) * 1000;
  }

  return async function getKey(kid) {
    if (now() >= expiresAt) {
      await refresh();
    }
    let key = keys.find((candidate) => candidate.kid === kid);
    if (!key && now() - fetchedAt >= MIN_REFETCH_MS) {
      await refresh();
      key = keys.find((candidate) => candidate.kid === kid);
    }
    return key ?? null;
  };
}

function decodePart(part) {
  return JSON.parse(Buffer.from(part, "base64url").toString("utf8"));
}

// Returns verifyGoogleCredential(credential):
//   { sub, hint } for a good token, where sub is Google's permanent id for the
//   person and hint is a name to suggest a username from; null for a bad token.
// It throws only when Google's keys cannot be loaded, which is not the
// person's fault, so the caller can say "try again" instead of "invalid".
export function createGoogleVerifier({
  clientId,
  getKey = createKeyFetcher(),
  now = Date.now,
}) {
  return async function verifyGoogleCredential(credential) {
    let header;
    let claims;
    let signature;
    let signedText;
    try {
      const parts = String(credential).split(".");
      if (parts.length !== 3) {
        return null;
      }
      header = decodePart(parts[0]);
      claims = decodePart(parts[1]);
      signature = Buffer.from(parts[2], "base64url");
      signedText = `${parts[0]}.${parts[1]}`;
    } catch (err) {
      return null;
    }

    // only the algorithm Google uses; never trust the token to pick its own
    if (header.alg !== "RS256" || typeof header.kid !== "string") {
      return null;
    }

    const jwk = await getKey(header.kid);
    if (!jwk) {
      return null;
    }
    try {
      const signedByGoogle = createVerify("RSA-SHA256")
        .update(signedText)
        .verify(createPublicKey({ key: jwk, format: "jwk" }), signature);
      if (!signedByGoogle) {
        return null;
      }
    } catch (err) {
      return null;
    }

    const time = now();
    const valid =
      ISSUERS.has(claims.iss) &&
      claims.aud === clientId &&
      typeof claims.sub === "string" &&
      claims.sub.length > 0 &&
      Number.isFinite(claims.exp) &&
      claims.exp * 1000 > time - CLOCK_SKEW_MS &&
      (claims.iat === undefined || claims.iat * 1000 < time + CLOCK_SKEW_MS);
    if (!valid) {
      return null;
    }

    const hint =
      typeof claims.given_name === "string"
        ? claims.given_name
        : typeof claims.email === "string"
          ? claims.email.split("@")[0]
          : "";
    return { sub: claims.sub, hint };
  };
}

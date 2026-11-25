import { createSign, generateKeyPairSync } from "node:crypto";

// A pretend Google: its own signing key, and a way to make tokens with it.
export const CLIENT_ID = "test-client.apps.googleusercontent.com";

function newKey(kid) {
  const { privateKey, publicKey } = generateKeyPairSync("rsa", {
    modulusLength: 2048,
  });
  return {
    kid,
    privateKey,
    jwk: { ...publicKey.export({ format: "jwk" }), kid },
  };
}

export const googleKey = newKey("key-1");
export const otherKey = newKey("key-1"); // same id, different key: a forgery

const encode = (value) =>
  Buffer.from(JSON.stringify(value)).toString("base64url");

export function makeToken(claims = {}, { key = googleKey, header = {} } = {}) {
  const now = Math.floor(Date.now() / 1000);
  const head = { alg: "RS256", kid: key.kid, typ: "JWT", ...header };
  const body = {
    iss: "https://accounts.google.com",
    aud: CLIENT_ID,
    sub: "google-sub-1",
    given_name: "Ash",
    email: "ash@example.com",
    email_verified: true,
    iat: now - 10,
    exp: now + 3600,
    ...claims,
  };
  const text = `${encode(head)}.${encode(body)}`;
  const signature = createSign("RSA-SHA256").update(text).sign(key.privateKey);
  return `${text}.${signature.toString("base64url")}`;
}

// the key lookup the verifier uses, answering from the fake Google
export const getFakeKey = async (kid) =>
  kid === googleKey.kid ? googleKey.jwk : null;

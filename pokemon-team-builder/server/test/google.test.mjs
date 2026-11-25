import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { createGoogleVerifier, createKeyFetcher } from "../google.mjs";
import { suggestUsername } from "../validate.mjs";
import {
  CLIENT_ID,
  googleKey,
  otherKey,
  makeToken,
  getFakeKey,
} from "./google.helpers.mjs";

const verify = createGoogleVerifier({
  clientId: CLIENT_ID,
  getKey: getFakeKey,
});
const nowSeconds = () => Math.floor(Date.now() / 1000);

describe("verifying a Google token", () => {
  test("accepts a good token and returns the stable id and a name hint", async () => {
    assert.deepEqual(await verify(makeToken()), {
      sub: "google-sub-1",
      hint: "Ash",
    });
  });

  test("accepts either spelling of Google's issuer", async () => {
    assert.ok(await verify(makeToken({ iss: "accounts.google.com" })));
  });

  test("falls back to the start of the email, then to nothing, for the hint", async () => {
    assert.equal(
      (await verify(makeToken({ given_name: undefined }))).hint,
      "ash",
    );
    const none = await verify(
      makeToken({ given_name: undefined, email: undefined }),
    );
    assert.equal(none.hint, "");
  });

  test("rejects a token made for a different app (wrong audience)", async () => {
    assert.equal(await verify(makeToken({ aud: "someone-elses-app" })), null);
  });

  test("rejects a different issuer", async () => {
    assert.equal(
      await verify(makeToken({ iss: "https://evil.example" })),
      null,
    );
  });

  test("rejects an expired token, but allows a little clock drift", async () => {
    assert.equal(await verify(makeToken({ exp: nowSeconds() - 600 })), null);
    assert.ok(await verify(makeToken({ exp: nowSeconds() - 10 })));
  });

  test("rejects a token issued in the future", async () => {
    assert.equal(await verify(makeToken({ iat: nowSeconds() + 3600 })), null);
  });

  test("rejects a missing or empty subject", async () => {
    assert.equal(await verify(makeToken({ sub: "" })), null);
    assert.equal(await verify(makeToken({ sub: 12345 })), null);
  });

  test("rejects a token signed by someone other than Google", async () => {
    assert.equal(await verify(makeToken({}, { key: otherKey })), null);
  });

  test("rejects a token whose contents were changed after signing", async () => {
    const [head, , signature] = makeToken().split(".");
    const forged = Buffer.from(
      JSON.stringify({
        iss: "https://accounts.google.com",
        aud: CLIENT_ID,
        sub: "someone-else",
        exp: nowSeconds() + 3600,
      }),
    ).toString("base64url");
    assert.equal(await verify(`${head}.${forged}.${signature}`), null);
  });

  test("never lets the token choose a weaker algorithm", async () => {
    assert.equal(
      await verify(makeToken({}, { header: { alg: "none" } })),
      null,
    );
    assert.equal(
      await verify(makeToken({}, { header: { alg: "HS256" } })),
      null,
    );
    const [head, body] = makeToken().split(".");
    assert.equal(await verify(`${head}.${body}.`), null);
  });

  test("rejects an unknown key id", async () => {
    assert.equal(
      await verify(makeToken({}, { header: { kid: "nope" } })),
      null,
    );
  });

  test("rejects junk without throwing", async () => {
    for (const junk of [
      "",
      "abc",
      "a.b",
      "a.b.c",
      "....",
      null,
      undefined,
      42,
    ]) {
      assert.equal(await verify(junk), null, String(junk));
    }
  });

  test("throws, rather than saying 'invalid', when Google's keys cannot be loaded", async () => {
    const broken = createGoogleVerifier({
      clientId: CLIENT_ID,
      getKey: async () => {
        throw new Error("network down");
      },
    });
    await assert.rejects(() => broken(makeToken()), /network down/);
  });
});

describe("Google's key list", () => {
  function fakeFetch(keys, { maxAge = 3600, ok = true } = {}) {
    const calls = { count: 0 };
    const fetchFn = async () => {
      calls.count += 1;
      return {
        ok,
        json: async () => ({ keys }),
        headers: { get: () => `public, max-age=${maxAge}` },
      };
    };
    return { fetchFn, calls };
  }

  test("is fetched once and reused while it is fresh", async () => {
    const { fetchFn, calls } = fakeFetch([googleKey.jwk]);
    const getKey = createKeyFetcher({ fetchFn, now: () => 1000 });
    assert.equal((await getKey("key-1")).kid, "key-1");
    await getKey("key-1");
    assert.equal(calls.count, 1);
  });

  test("is fetched again once Google's max-age has passed", async () => {
    let time = 0;
    const { fetchFn, calls } = fakeFetch([googleKey.jwk], { maxAge: 10 });
    const getKey = createKeyFetcher({ fetchFn, now: () => time });
    await getKey("key-1");
    time = 11_000;
    await getKey("key-1");
    assert.equal(calls.count, 2);
  });

  test("an unknown key id triggers one refetch, but not a flood of them", async () => {
    let time = 0;
    const { fetchFn, calls } = fakeFetch([googleKey.jwk]);
    const getKey = createKeyFetcher({ fetchFn, now: () => time });
    await getKey("key-1");
    assert.equal(await getKey("rotated"), null);
    assert.equal(calls.count, 1); // too soon to ask again
    time = 61_000;
    assert.equal(await getKey("rotated"), null);
    assert.equal(calls.count, 2);
    assert.equal(await getKey("rotated"), null);
    assert.equal(calls.count, 2); // and not again straight away
  });

  test("a failed fetch is an error", async () => {
    const { fetchFn } = fakeFetch([], { ok: false });
    const getKey = createKeyFetcher({ fetchFn });
    await assert.rejects(() => getKey("key-1"));
  });
});

describe("suggesting a username", () => {
  test("keeps letters, numbers and underscores", () => {
    assert.equal(suggestUsername("Ash"), "Ash");
    assert.equal(suggestUsername("ash.ketchum+pokemon"), "ash_ketchum_pokemon");
  });

  test("turns accents into plain letters", () => {
    assert.equal(suggestUsername("José"), "Jose");
  });

  test("falls back to 'trainer' when nothing usable is left", () => {
    for (const hint of ["", "日本語", "!!", "ab", undefined]) {
      assert.equal(suggestUsername(hint), "trainer", String(hint));
    }
  });

  test("always fits the username rules, with or without a suffix", () => {
    const rules = /^[A-Za-z0-9_]{3,30}$/;
    for (const hint of ["x".repeat(80), "a b c", "___a___", "Zoë Ünïcode"]) {
      assert.match(suggestUsername(hint), rules);
      assert.match(suggestUsername(hint, "_4821"), rules);
    }
  });
});

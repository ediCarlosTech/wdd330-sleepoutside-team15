import { openDatabase } from "../db.mjs";
import { createApp } from "../app.mjs";

// Starts the real app on a free port with a throwaway database.
export async function startServer(options = {}) {
  const db = openDatabase(":memory:");
  const app = createApp({ db, ...options });
  const server = await new Promise((resolve) => {
    const listening = app.listen(0, "127.0.0.1", () => resolve(listening));
  });
  const base = `http://127.0.0.1:${server.address().port}`;

  return {
    db,
    base,
    close: () =>
      new Promise((resolve) => {
        server.close(() => {
          db.close();
          resolve();
        });
      }),
  };
}

// A tiny browser stand-in: keeps cookies between requests.
export function createClient(base) {
  let cookie = "";

  async function request(method, path, body, headers = {}) {
    const response = await fetch(`${base}${path}`, {
      method,
      headers: {
        ...(body === undefined ? {} : { "Content-Type": "application/json" }),
        ...(cookie ? { Cookie: cookie } : {}),
        ...headers,
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });

    const setCookie = response.headers.getSetCookie();
    if (setCookie.length > 0) {
      const [pair] = setCookie[0].split(";");
      cookie = pair.endsWith("=") ? "" : pair;
    }
    const text = await response.text();
    return {
      status: response.status,
      headers: response.headers,
      setCookie,
      body: text ? JSON.parse(text) : null,
    };
  }

  return {
    get: (path, headers) => request("GET", path, undefined, headers),
    post: (path, body, headers) => request("POST", path, body, headers),
    put: (path, body, headers) => request("PUT", path, body, headers),
    delete: (path, body, headers) => request("DELETE", path, body, headers),
    get cookie() {
      return cookie;
    },
    clearCookie() {
      cookie = "";
    },
  };
}

export const CREDENTIALS = {
  username: "ash_ketchum",
  password: "pikachu-rules-1",
};

export const OWNED = {
  species: "pikachu",
  nickname: "Sparky",
  cp: 1500,
  level: 30.5,
  ivAttack: 15,
  ivDefense: 14,
  ivStamina: 13,
  fastMove: "Thunder Shock",
  chargedMove1: "Wild Charge",
  chargedMove2: "Thunderbolt",
  shiny: true,
  shadow: false,
  lucky: false,
  notes: "Best buddy",
};

import express from "express";
import { hashPassword, verifyPassword, getDummyHash } from "./passwords.mjs";
import {
  SESSION_COOKIE,
  createSession,
  findSessionUser,
  deleteSession,
  readCookie,
} from "./sessions.mjs";
import { createLimiter } from "./rateLimit.mjs";
import {
  MAX_OWNED_PER_USER,
  validateCredentials,
  validateOwned,
  ownedFromRow,
} from "./validate.mjs";

// What a page may load. The app uses its own files, PokeAPI for data,
// GIPHY for reaction GIFs, Google Fonts, and https images (sprites).
const CONTENT_SECURITY_POLICY = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' https://fonts.googleapis.com",
  "font-src https://fonts.gstatic.com",
  "img-src 'self' https: data:",
  "connect-src 'self' https://pokeapi.co https://api.giphy.com",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join("; ");

const READ_ONLY_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);
const BODY_METHODS = new Set(["POST", "PUT", "PATCH"]);

const OWNED_COLUMNS = `species, nickname, cp, level, iv_attack, iv_defense, iv_stamina,
  fast_move, charged_move_1, charged_move_2, shiny, shadow, lucky, notes`;

function securityHeaders(production) {
  return (request, response, next) => {
    response.set({
      "Content-Security-Policy": CONTENT_SECURITY_POLICY,
      "X-Content-Type-Options": "nosniff",
      "X-Frame-Options": "DENY",
      "Referrer-Policy": "strict-origin-when-cross-origin",
    });
    if (production) {
      response.set(
        "Strict-Transport-Security",
        "max-age=15552000; includeSubDomains",
      );
    }
    next();
  };
}

// A request that changes something must come from this site. Browsers send an
// Origin header on those requests, and cross-site pages cannot fake it.
function cameFromThisSite(request, extraOrigins) {
  const origin = request.get("origin");
  if (origin) {
    return (
      origin === `${request.protocol}://${request.get("host")}` ||
      extraOrigins.includes(origin)
    );
  }
  // no Origin: a browser may still say so with Sec-Fetch-Site; other clients are allowed
  const site = request.get("sec-fetch-site");
  return !site || site === "same-origin" || site === "none";
}

function tooManyAttempts(response, seconds) {
  response.set("Retry-After", String(seconds));
  return response.status(429).json({
    error: `Too many attempts. Try again in ${Math.ceil(seconds / 60)} minute(s).`,
  });
}

// options let the tests use a throwaway database and tight limits
export function createApp({
  db,
  production = false,
  staticDir = null,
  extraOrigins = [],
  loginByUser = { max: 8, windowMs: 15 * 60 * 1000 },
  loginByIp = { max: 40, windowMs: 15 * 60 * 1000 },
  registerByIp = { max: 20, windowMs: 60 * 60 * 1000 },
} = {}) {
  const app = express();
  app.disable("x-powered-by");
  if (production) {
    // the host's proxy terminates HTTPS, so trust it for the real address and protocol
    app.set("trust proxy", 1);
  }
  app.use(securityHeaders(production));

  const userLimiter = createLimiter(loginByUser);
  const ipLimiter = createLimiter(loginByIp);
  const registerLimiter = createLimiter(registerByIp);

  const api = express.Router();

  api.use((request, response, next) => {
    // answers are about one person, so nothing should store them
    response.set("Cache-Control", "no-store");

    if (!READ_ONLY_METHODS.has(request.method)) {
      if (!cameFromThisSite(request, extraOrigins)) {
        return response
          .status(403)
          .json({ error: "That request came from another site." });
      }
      // A plain HTML form on another site can only send form-style bodies, so
      // requiring JSON on POST/PUT/PATCH shuts that door. DELETE has no form
      // equivalent, and the Origin check above covers it as well.
      if (BODY_METHODS.has(request.method)) {
        const type = request.get("content-type") ?? "";
        if (!type.toLowerCase().startsWith("application/json")) {
          return response.status(415).json({ error: "Send JSON." });
        }
      }
    }
    return next();
  });
  api.use(express.json({ limit: "20kb" }));

  function startSession(response, userId) {
    const { token, expiresAt } = createSession(db, userId);
    response.cookie(SESSION_COOKIE, token, {
      httpOnly: true, // page scripts cannot read it
      sameSite: "lax", // not sent with requests from other sites
      secure: production, // HTTPS only when deployed
      path: "/",
      expires: new Date(expiresAt),
    });
  }

  function endSession(request, response) {
    deleteSession(db, readCookie(request, SESSION_COOKIE));
    response.clearCookie(SESSION_COOKIE, {
      httpOnly: true,
      sameSite: "lax",
      secure: production,
      path: "/",
    });
  }

  function requireUser(request, response, next) {
    const user = findSessionUser(db, readCookie(request, SESSION_COOKIE));
    if (!user) {
      return response.status(401).json({ error: "Log in to continue." });
    }
    request.user = user;
    return next();
  }

  // ---- accounts ----

  api.post("/auth/register", async (request, response) => {
    const wait = registerLimiter.retryAfter(request.ip);
    if (wait) {
      return tooManyAttempts(response, wait);
    }

    const parsed = validateCredentials(request.body, { creating: true });
    if (parsed.error) {
      return response.status(400).json({ error: parsed.error });
    }
    // every attempt counts, so one address cannot create accounts in bulk
    registerLimiter.hit(request.ip);

    const { username, password } = parsed.value;
    const hash = await hashPassword(password);

    let userId;
    try {
      userId = Number(
        db
          .prepare(
            "INSERT INTO users (username, password_hash, created_at) VALUES (?, ?, ?)",
          )
          .run(username, hash, new Date().toISOString()).lastInsertRowid,
      );
    } catch (err) {
      if (err.code === "SQLITE_CONSTRAINT_UNIQUE") {
        return response.status(409).json({ error: "That username is taken." });
      }
      throw err;
    }

    startSession(response, userId);
    return response.status(201).json({ user: { id: userId, username } });
  });

  api.post("/auth/login", async (request, response) => {
    const parsed = validateCredentials(request.body, { creating: false });
    if (parsed.error) {
      return response.status(400).json({ error: parsed.error });
    }
    const { username, password } = parsed.value;

    const userKey = username.toLowerCase();
    const wait = Math.max(
      userLimiter.retryAfter(userKey),
      ipLimiter.retryAfter(request.ip),
    );
    if (wait) {
      return tooManyAttempts(response, wait);
    }

    const row = db
      .prepare(
        "SELECT id, username, password_hash FROM users WHERE username = ?",
      )
      .get(username);
    // a made-up name still costs one hash, so timing does not reveal who exists
    const passwordIsRight = await verifyPassword(
      password,
      row ? row.password_hash : await getDummyHash(),
    );

    if (!row || !passwordIsRight) {
      userLimiter.hit(userKey);
      ipLimiter.hit(request.ip);
      // the same answer for "no such user" and "wrong password"
      return response
        .status(401)
        .json({ error: "Username or password is incorrect." });
    }

    userLimiter.reset(userKey);
    startSession(response, row.id);
    return response.json({ user: { id: row.id, username: row.username } });
  });

  api.post("/auth/logout", (request, response) => {
    endSession(request, response);
    response.status(204).end();
  });

  // logged out is a normal answer, not an error, so the page logs nothing scary
  api.get("/auth/me", (request, response) => {
    const user = findSessionUser(db, readCookie(request, SESSION_COOKIE));
    response.json({ user: user ?? null });
  });

  // deletes the account, its sessions, and every Pokémon it tracked
  api.delete("/account", requireUser, async (request, response) => {
    const key = request.user.username.toLowerCase();
    const wait = userLimiter.retryAfter(key);
    if (wait) {
      return tooManyAttempts(response, wait);
    }

    const password =
      typeof request.body?.password === "string" ? request.body.password : "";
    const row = db
      .prepare("SELECT password_hash FROM users WHERE id = ?")
      .get(request.user.id);

    if (!(await verifyPassword(password, row.password_hash))) {
      userLimiter.hit(key);
      return response
        .status(403)
        .json({ error: "That password is not right." });
    }

    db.prepare("DELETE FROM users WHERE id = ?").run(request.user.id);
    endSession(request, response);
    return response.status(204).end();
  });

  // ---- owned Pokémon (every query is limited to the signed-in user) ----

  function idParam(request) {
    const id = Number(request.params.id);
    return Number.isInteger(id) && id > 0 ? id : null;
  }

  function ownedFields(userId, value) {
    return {
      userId,
      now: new Date().toISOString(),
      ...value,
    };
  }

  api.get("/owned", requireUser, (request, response) => {
    const rows = db
      .prepare("SELECT * FROM owned WHERE user_id = ? ORDER BY id DESC")
      .all(request.user.id);
    response.json({ owned: rows.map(ownedFromRow) });
  });

  api.post("/owned", requireUser, (request, response) => {
    const parsed = validateOwned(request.body);
    if (parsed.error) {
      return response.status(400).json({ error: parsed.error });
    }

    const { n: count } = db
      .prepare("SELECT COUNT(*) AS n FROM owned WHERE user_id = ?")
      .get(request.user.id);
    if (count >= MAX_OWNED_PER_USER) {
      return response.status(409).json({
        error: `You can track up to ${MAX_OWNED_PER_USER} Pokémon.`,
      });
    }

    const info = db
      .prepare(
        `INSERT INTO owned (user_id, ${OWNED_COLUMNS}, created_at, updated_at)
         VALUES (@userId, @species, @nickname, @cp, @level, @ivAttack, @ivDefense,
                 @ivStamina, @fastMove, @chargedMove1, @chargedMove2,
                 @shiny, @shadow, @lucky, @notes, @now, @now)`,
      )
      .run(ownedFields(request.user.id, parsed.value));

    const row = db
      .prepare("SELECT * FROM owned WHERE id = ?")
      .get(info.lastInsertRowid);
    return response.status(201).json({ owned: ownedFromRow(row) });
  });

  api.put("/owned/:id", requireUser, (request, response) => {
    const id = idParam(request);
    const parsed = validateOwned(request.body);
    if (parsed.error) {
      return response.status(400).json({ error: parsed.error });
    }

    const info = db
      .prepare(
        `UPDATE owned SET species = @species, nickname = @nickname, cp = @cp,
           level = @level, iv_attack = @ivAttack, iv_defense = @ivDefense,
           iv_stamina = @ivStamina, fast_move = @fastMove,
           charged_move_1 = @chargedMove1, charged_move_2 = @chargedMove2,
           shiny = @shiny, shadow = @shadow, lucky = @lucky, notes = @notes,
           updated_at = @now
         WHERE id = @id AND user_id = @userId`,
      )
      .run({ ...ownedFields(request.user.id, parsed.value), id });

    // someone else's Pokémon and a missing one look the same
    if (id === null || info.changes === 0) {
      return response.status(404).json({ error: "Pokémon not found." });
    }
    const row = db.prepare("SELECT * FROM owned WHERE id = ?").get(id);
    return response.json({ owned: ownedFromRow(row) });
  });

  api.delete("/owned/:id", requireUser, (request, response) => {
    const id = idParam(request);
    const info = db
      .prepare("DELETE FROM owned WHERE id = ? AND user_id = ?")
      .run(id, request.user.id);

    if (id === null || info.changes === 0) {
      return response.status(404).json({ error: "Pokémon not found." });
    }
    return response.status(204).end();
  });

  api.use((request, response) => {
    response.status(404).json({ error: "Not found." });
  });

  app.use("/api", api);

  if (staticDir) {
    app.use(express.static(staticDir));
  }

  // eslint-disable-next-line no-unused-vars
  app.use((err, request, response, next) => {
    if (err.type === "entity.too.large") {
      return response.status(413).json({ error: "That request is too big." });
    }
    if (err.type === "entity.parse.failed") {
      return response
        .status(400)
        .json({ error: "That request was not valid JSON." });
    }
    // never show internal details to the browser
    console.error(err);
    return response
      .status(500)
      .json({ error: "Something went wrong on our side. Try again." });
  });

  return app;
}

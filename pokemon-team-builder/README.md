# Pokémon Team Builder

Search Pokémon, see their types, stats, and abilities, build a team of up to six, and get a report on its strengths and weaknesses. Log in to track the Pokémon you own (CP, IVs, moves) and have them nudge the team recommendations.

## Run it

```bash
npm install
npm start            # site and account server together, on http://localhost:5173
npm run lint         # ESLint (site and server)
npm test             # Jest (site) + node:test (server)
npm run build        # production build in dist/
```

`npm start` runs the account server inside Vite's dev server, so the page and the API share one origin and the login cookie just works. Accounts are saved in `data/app.db` (change it with `DATABASE_PATH`).

**"Accounts aren't available right now"** means the page could not reach an account server. In development, check that you started the site with `npm start` and that the terminal has no error from the account server. When deployed, it usually means the site was hosted as a Static Site: it needs a Web Service running `npm run server` (see Deploying).

To run it the way it is deployed (one process serving the built site and the API):

```bash
npm run build
NODE_ENV=production npm run server     # http://localhost:3000
```

PokeAPI needs no key. Reaction GIFs are optional: copy `.env.sample` to `.env` and add a free [GIPHY](https://developers.giphy.com/) key as `VITE_GIPHY_API_KEY`. Without it, the team page works and just leaves the GIF out. Anything in a `VITE_` variable is public in the browser.

### Server settings

| Variable           | Default       | Meaning                                                                                      |
| ------------------ | ------------- | -------------------------------------------------------------------------------------------- |
| `PORT`             | `3000`        | Port to listen on                                                                            |
| `DATABASE_PATH`    | `data/app.db` | SQLite file. Point it at a persistent disk when deployed                                     |
| `NODE_ENV`         |               | `production` makes the cookie HTTPS-only, adds HSTS, trusts the host's proxy, serves `dist/` |
| `SERVE_STATIC`     |               | `1` serves `dist/` without production mode (for local checks)                                |
| `ALLOWED_ORIGINS`  |               | Extra origins allowed to make changes, comma separated. Usually not needed                   |
| `GOOGLE_CLIENT_ID` |               | Turns on "Continue with Google" (see below). Leave empty to keep it off                      |

### Google sign-in (optional)

1. In [Google Cloud Console](https://console.cloud.google.com/) open **APIs & Services > Credentials** and create an **OAuth client ID** of type **Web application**. (You may be asked to set up the consent screen first. Only basic profile access is needed.)
2. Under **Authorized JavaScript origins**, add every address the site runs on, for example `http://localhost:5173` and your Render address. No redirect URI is needed.
3. Start the server with `GOOGLE_CLIENT_ID=<your id>.apps.googleusercontent.com`. For local development: `GOOGLE_CLIENT_ID=<your id>.apps.googleusercontent.com npm start`. On Render, add it as an environment variable. (It is read from the environment, not from `.env`.)

The client ID is public by design, so it is safe for the browser to see it. There is no secret to protect. When it is set, a **Continue with Google** button appears in the login pop-up, and a **Connect Google** button appears on My Pokémon. When it is empty, none of this shows and the page never contacts Google.

This could not be tried against real Google in the build environment, which has no access to it. The sign-in code was tested with local test keys and a stand-in for Google's script, so please try one real sign-in after setting it up.

## Features

- **Search:** by name, Pokédex number, or type, or any mix. Names that start with the term come first. Results load 12 at a time.
- **Details:** artwork, description, size, abilities, and base-stat meters in a pop-up.
- **Team builder:** no repeats and a clear message when the team is full. The size can be 1 to 6: 6 for the main series, 3 for Pokémon GO Battle League. The header shows `Team n/size`. Making the team smaller asks first, then drops Pokémon from the end.
- **Accounts:** create an account and log in from the header. The login lasts 30 days on that browser, and you can log out or delete the account (with your password) from My Pokémon.
- **Google sign-in (when set up):** continue with Google instead of a password. A Google account makes its own account the first time, or you can connect Google to an existing account from My Pokémon so both ways open the same account. An account made only with Google is deleted by typing its username.
- **Password managers:** the forms use the standard `autocomplete` values (`username`, `current-password`, `new-password`) and rules hints, and Chrome and Edge are asked to offer saving the login after a sign-up or login.
- **My Pokémon:** add the Pokémon you own with a nickname, CP, level (1 to 51), the three IVs, a fast move and two charged moves, Shiny / Shadow / Lucky, and notes. Edit or remove them any time. The list is sorted by CP and shows the IV total as a percent and a meter.
- **Owned Pokémon influence the search:** owned Pokémon get an "Owned" badge, the details pop-up shows your best one, and owned Pokémon that already fit your team get a recommendation bonus (more for strong IVs). It is a nudge, never a filter. Tick "Only my Pokémon" to narrow the results to what you own.
- **Recommended Pokémon:** with a team that has room (not full), the 12 best fits are pinned to the top of the search results with a "Recommended" label and the reasons (what they resist that hurts your team, and which types they add coverage against). Pinning works inside a name search or a type filter too.
- **Save and load:** name and save teams, load or delete them later. A saved team remembers its size. Saving under an existing name replaces it.
- **Favorites and recently viewed:** shortcuts on the search page. Recent keeps the last 8.
- **Team report:** weaknesses and resistances for all 18 types (dual types included), type coverage, and plain-language suggestions.
- **Drill-through:** rest the pointer on a type in the weakness table for about a second (or select it, or press Enter) to see which of your Pokémon are weak to it, resist it, or are immune, with the exact multiplier. Select a name to open its details. Escape closes it.
- **Type matchup diagram:** the 18 types on a ring on the team page. Arrows run from each type on your team to the types it hits super effectively. Types your team covers get a ✓ and a solid edge, types it doesn't get a ✗ and a dashed edge, and your own types are outlined. Select any type (works without a team too) to see what it hits (solid arrows) and what hits it (dashed arrows), written out below the diagram. Escape clears it. Labels shrink to three letters on narrow screens.
- **Type coverage:** grouped into **Covered** and **Not covered**, each with a count.
- **Header:** the search bar only appears on the search page. Elsewhere a Home button takes its place.
- **Reactions:** a GIPHY GIF for your newest teammate, or a celebration when the team is full. People who prefer reduced motion get a still frame.
- **Everything survives a reload:** the current team, saved teams, favorites, and recent Pokémon live in `localStorage`.

## Accessibility

Dialogs and forms have real labels and the right `autocomplete` values, so password managers work. Skip link, focus moves to the page heading when you switch pages, native `<dialog>` for details, live regions for messages, labeled icon buttons, 44px tap targets, visible focus, no meaning from color alone (risks say "(risk)", coverage says "Covered" or "Not covered"), and reduced-motion support.

## Structure

| File                        | Job                                                            |
| --------------------------- | -------------------------------------------------------------- |
| `src/js/main.js`            | Page routing (`#/search`, `#/team`, `#/owned`) and wiring      |
| `src/js/pokeapi.js`         | Every PokeAPI request, with caching                            |
| `src/js/gifapi.js`          | GIPHY requests                                                 |
| `src/js/search.js`          | Name, number, and type matching                                |
| `src/js/searchView.js`      | The search page                                                |
| `src/js/teamView.js`        | The team page: slots, saving, report, reaction                 |
| `src/js/teamBuilder.js`     | The team rules (size 1 to 6, no repeats)                       |
| `src/js/teamAnalysis.js`    | Type chart, weaknesses, coverage, suggestions                  |
| `src/js/typeDiagram.js`     | The matchup diagram: ring layout, arrows, selecting a type     |
| `src/js/recommend.js`       | Scores Pokémon against the team and pins the best fits         |
| `src/js/owned.js`           | Owned-Pokémon helpers: IV math, best-of-species, form to body  |
| `src/js/accountApi.js`      | Calls to the account server (never throws)                     |
| `src/js/account.js`         | Who is logged in and what they own; pages listen for changes   |
| `src/js/authView.js`        | Header login controls, login and delete-account pop-ups        |
| `src/js/googleSignIn.js`    | Loads Google's script on demand and draws its button           |
| `src/js/ownedView.js`       | The My Pokémon page                                            |
| `src/js/storage.js`         | All `localStorage` reads and writes                            |
| `src/js/renderer.js`        | HTML templates (all text is escaped)                           |
| `src/js/details.js`         | The details pop-up                                             |
| `src/js/animations.js`      | The one animation: a pop when a Pokémon joins the team         |
| `server/app.mjs`            | The Express app: routes, security headers, request checks      |
| `server/index.mjs`          | Starts the server                                              |
| `server/db.mjs`             | SQLite schema (users, sessions, owned)                         |
| `server/passwords.mjs`      | scrypt password hashing                                        |
| `server/google.mjs`         | Checks Google tokens (signature, audience, expiry), no library |
| `server/sessions.mjs`       | Login sessions and the cookie                                  |
| `server/validate.mjs`       | Checks everything the browser sends                            |
| `server/rateLimit.mjs`      | Limits for login and sign-up attempts                          |
| `src/test/`, `server/test/` | Jest tests (site) and node:test tests (server)                 |

`searchView.js`, `teamView.js`, and the account modules are additions to the proposal's module list. They keep `main.js` short.

## How accounts and security work

- **Passwords** are hashed with scrypt (a salt per password, settings stored with the hash). The server never stores or logs the password.
- **Login sessions** use a random token in an `HttpOnly`, `SameSite=Lax` cookie (and `Secure` in production). Page scripts cannot read it. The database stores only a SHA-256 hash of the token, so a leaked database does not hand out logins. Logging out deletes the session on the server.
- **Wrong logins** get one generic message whether the name or the password was wrong, and unknown names cost the same time as real ones. Too many failures from one name or one address are blocked for a while (429).
- **Google tokens** are checked on the server, never trusted from the page: the RS256 signature against Google's published keys (fetched over HTTPS and cached), the issuer, that the token was made for this site's client ID, and that it has not expired. Accounts are matched by Google's permanent ID, never by name or email, so nobody can take over an account by choosing a matching name. No email address is stored. Google-only accounts have no password at all, so password login can never succeed for them.
- **Other sites** cannot make changes for you: changes need a matching `Origin`, and JSON bodies are required on POST, PUT, and PATCH.
- **Your data is yours:** every owned-Pokémon query is scoped to the logged-in user. Asking for someone else's returns "not found".
- **Everything is validated on the server** (IVs 0 to 15, level 1 to 51 in half steps, text lengths, strict booleans, up to 1000 Pokémon each), and unexpected fields are ignored.
- **Headers:** a Content-Security-Policy that only allows this site, PokeAPI, GIPHY, and Google Fonts (and Google's sign-in script, only when it is turned on), plus `nosniff`, `X-Frame-Options`, and (in production) HSTS.

## Deploying (for example on Render)

Create a **Web Service** (not a Static Site), because the same process serves the pages and the API.

- **Build command:** `npm install --include=dev && npm run build` (Vite is a dev dependency)
- **Start command:** `npm run server`
- **Environment:** `NODE_ENV=production`, `DATABASE_PATH=/var/data/app.db`, and optionally `GOOGLE_CLIENT_ID`
- **Persistent disk:** mount one at `/var/data`. SQLite is a single file, and without a disk it is wiped on every deploy. Render persistent disks need a paid instance type, so check the current plans. The `better-sqlite3` package installs a prebuilt binary or compiles one, so the build needs to be able to do either.
- **Reaction GIFs:** set `VITE_GIPHY_API_KEY` as a build-time variable.

Run a single instance: the login-attempt limiter lives in memory, and SQLite does not share a file between servers.

## How recommendations work

Each candidate gets points for resisting a type that more of your team is weak to than resists (immunities count extra) and for hitting types your team's own types cannot hit super effectively (worth half as much, because moves can also fill that gap). It loses points for being weak to what already hurts your team, and a little for any new weakness. The top scorers are pinned; ties keep Pokédex order.

Owned Pokémon add a bonus on top of that score: 1 point, plus up to 1 more for strong IVs (unknown IVs count as average). The bonus only applies to Pokémon that already suit the team, so owning something never pins a bad fit, and a clearly better fit you do not own still comes first. The reasons end with "You own one: CP …, IVs …".

PokeAPI has no list of every Pokémon with its types, so the first search with a team loads the 18 type lists once (18 requests) and builds a name-to-types map from them. If that fails, the plain results still show. Recommendations use types only, not stats or moves.

## Not done yet

- **Teams and favorites stay in the browser.** Only owned Pokémon sync to your account. Saving teams to the account would be the next step.
- **No password reset, change-password, or "log out everywhere".** There is no email on file, so a forgotten password cannot be recovered (connecting Google first gives a second way in). Deleting the account is the only way to start over. Registration also reveals whether a username is taken. Change-password and log-out-everywhere would be the next account features.
- **Google and password accounts are separate unless linked.** Signing in with Google for the first time makes a new account. Use Connect Google on My Pokémon, while logged in, to attach it to an existing one. There is no "disconnect" yet.
- **Moves and CP are typed in.** PokeAPI has the main-series moves and base stats, not Pokémon GO movesets or CP, so these are free text and a number you enter.
- **One server only.** The attempt limiter is in memory, and SQLite is a single file.
- **User preferences** and **team analysis history** from the proposal's storage list.
- **Coverage is by type only.** It uses each Pokémon's own types, not its moves.
- **Not tested against the live PokeAPI.** The build environment could not reach it, so the browser tests use a mock. The first run on a real connection is worth a look.
- **Migrate from disk use to Postgres DB.** 
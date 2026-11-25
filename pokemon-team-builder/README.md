# Pokémon Team Builder

Search Pokémon, see their types, stats, and abilities, build a team of six, and get a report on its strengths and weaknesses.

## Run it

```bash
npm install
npm start        # local dev server
npm run lint     # ESLint
npm test         # Jest
npm run build    # production build in dist/
```

PokeAPI needs no key. Reaction GIFs are optional: copy `.env.sample` to `.env` and add a free [GIPHY](https://developers.giphy.com/) key as `VITE_GIPHY_API_KEY`. Without it, the team page works and just leaves the GIF out. Anything in a `VITE_` variable is public in the browser.

## Features

- **Search:** by name, Pokédex number, or type, or any mix. Names that start with the term come first. Results load 12 at a time.
- **Details:** artwork, description, size, abilities, and base-stat meters in a pop-up.
- **Team builder:** six slots, no repeats, a clear message when the team is full. The header shows `Team n/6`.
- **Save and load:** name and save teams, load or delete them later. Saving under an existing name replaces it.
- **Favorites and recently viewed:** shortcuts on the search page. Recent keeps the last 8.
- **Team report:** weaknesses and resistances for all 18 types (dual types included), type coverage, and plain-language suggestions.
- **Reactions:** a GIPHY GIF for your newest teammate, or a celebration when the team is full. People who prefer reduced motion get a still frame.
- **Everything survives a reload:** the current team, saved teams, favorites, and recent Pokémon live in `localStorage`.

## Accessibility

Skip link, focus moves to the page heading when you switch pages, native `<dialog>` for details, live regions for messages, labeled icon buttons, 44px tap targets, visible focus, no meaning from color alone (risks say "(risk)", coverage says "Covered" or "Not covered"), and reduced-motion support.

## Structure

| File                     | Job                                                    |
| ------------------------ | ------------------------------------------------------ |
| `src/js/main.js`         | Page routing (`#/search`, `#/team`) and wiring         |
| `src/js/pokeapi.js`      | Every PokeAPI request, with caching                    |
| `src/js/gifapi.js`       | GIPHY requests                                         |
| `src/js/search.js`       | Name, number, and type matching                        |
| `src/js/searchView.js`   | The search page                                        |
| `src/js/teamView.js`     | The team page: slots, saving, report, reaction         |
| `src/js/teamBuilder.js`  | The six-member team rules                              |
| `src/js/teamAnalysis.js` | Type chart, weaknesses, coverage, suggestions          |
| `src/js/storage.js`      | All `localStorage` reads and writes                    |
| `src/js/renderer.js`     | HTML templates (API text is escaped)                   |
| `src/js/details.js`      | The details pop-up                                     |
| `src/js/animations.js`   | The one animation: a pop when a Pokémon joins the team |
| `src/test/`              | Jest tests                                             |

`searchView.js` and `teamView.js` are additions to the proposal's module list. They keep `main.js` short.

## Not done yet

- **User preferences** and **team analysis history** from the proposal's storage list.
- **Deployment** (Week 7).
- **Coverage is by type only.** It uses each Pokémon's own types, not its moves.

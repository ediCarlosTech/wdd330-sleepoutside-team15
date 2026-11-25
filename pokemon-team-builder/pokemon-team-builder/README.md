# Pokémon Team Builder

Search Pokémon, see their types, stats, and abilities, and (coming soon) build a balanced team of six.

## Run it

```bash
npm install
npm start        # local dev server
npm run lint     # ESLint
npm test         # Jest
npm run build    # production build in dist/
```

No API key is needed for PokeAPI.

## Status

### Week 5: Core foundation (done)

- **Search:** type part of a name, or pick a type, or both. Names that start with the term come first. Results load 12 at a time with a "Show more" button.
- **Details:** each card opens a pop-up with artwork, description, height, weight, abilities, and base stat meters.
- **Errors:** a failed search or a failed card shows a plain message instead of a blank page.
- **Layout:** mobile first, with the proposal's colors, Poppins and Roboto fonts, rounded cards, and a Poké Ball loader.

### Next

- **Week 6:** team builder (six slots), validation, `storage.js` for saved teams, favorites, and recent Pokémon. The header "Team 0/6" count is a placeholder until then.
- **Week 7:** `teamAnalysis.js` type matchups, `gifapi.js` reactions, polish, accessibility pass, deploy.

## Structure

| File                 | Job                                    |
| -------------------- | -------------------------------------- |
| `src/js/main.js`     | Wires the page together                |
| `src/js/pokeapi.js`  | Every PokeAPI request, with caching    |
| `src/js/search.js`   | Name and type matching                 |
| `src/js/renderer.js` | HTML templates (API text is escaped)   |
| `src/js/details.js`  | The details pop-up (native `<dialog>`) |
| `src/test/`          | Jest tests                             |

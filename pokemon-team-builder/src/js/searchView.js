import { findPokemonNames, PAGE_SIZE } from "./search.js";
import { pokemonCardTemplate, formatName } from "./renderer.js";
import { POKEMON_TYPES } from "./pokeapi.js";

// The search page: the form, type filter, shortcuts, and the grid of cards.
// api: the pokeapi module; storage: getFavorites() and getRecent()
export default function initSearchView({ api, storage }) {
  const input = document.querySelector("#search-input");
  const typeFilter = document.querySelector("#type-filter");
  const summary = document.querySelector("#result-summary");
  const loader = document.querySelector("#loader");
  const results = document.querySelector("#results");
  const loadMore = document.querySelector("#load-more");

  // names that match the current search, and how many are on screen
  let matches = [];
  let shown = 0;
  let failedCards = 0;
  // what the list is called in the summary line
  let noun = "Pokémon";
  // bumped on every new search so answers to an older one are ignored
  let latestSearch = 0;

  function fillTypeFilter() {
    const options = POKEMON_TYPES.map(
      (type) => `<option value="${type}">${formatName(type)}</option>`,
    ).join("");
    typeFilter.insertAdjacentHTML("beforeend", options);
  }

  function updateSummary() {
    const failedNote =
      failedCards > 0 ? ` (${failedCards} could not be loaded)` : "";
    summary.textContent = `Showing ${shown} of ${matches.length} ${noun}${failedNote}`;
    loadMore.classList.toggle("hide", shown >= matches.length);
  }

  // load the details for the next page of names and draw their cards
  async function showNextPage() {
    const search = latestSearch;
    const names = matches.slice(shown, shown + PAGE_SIZE);

    loader.classList.remove("hide");
    loadMore.disabled = true;

    // allSettled: one failed Pokémon should not hide the rest
    const settled = await Promise.allSettled(
      names.map((name) => api.getPokemon(name)),
    );

    if (search !== latestSearch) {
      return;
    }

    const pokemon = settled
      .filter((result) => result.status === "fulfilled")
      .map((result) => result.value);

    shown += names.length;
    failedCards += names.length - pokemon.length;

    results.insertAdjacentHTML(
      "beforeend",
      pokemon.map(pokemonCardTemplate).join(""),
    );
    loader.classList.add("hide");
    loadMore.disabled = false;
    updateSummary();
  }

  // clear the page for a new list and return its search number
  function reset() {
    latestSearch += 1;
    matches = [];
    shown = 0;
    failedCards = 0;
    results.innerHTML = "";
    loadMore.classList.add("hide");
    loader.classList.add("hide");
    return latestSearch;
  }

  async function showMatches(names, listNoun, emptyMessage) {
    matches = names;
    noun = listNoun;
    if (matches.length === 0) {
      summary.textContent = emptyMessage;
      return;
    }
    await showNextPage();
  }

  async function runSearch() {
    const search = reset();
    loader.classList.remove("hide");
    summary.textContent = "Searching…";

    let names;
    try {
      names = await findPokemonNames(
        { term: input.value, type: typeFilter.value },
        api,
      );
    } catch (err) {
      if (search === latestSearch) {
        loader.classList.add("hide");
        summary.textContent =
          "We couldn't reach the Pokémon database. Check your connection, then search again.";
      }
      return;
    }

    if (search !== latestSearch) {
      return;
    }
    loader.classList.add("hide");
    await showMatches(
      names,
      "Pokémon",
      "No Pokémon match that search. Try a shorter name or choose All types.",
    );
  }

  // show a saved list (favorites or recent) in the same grid
  function showSavedList(names, listNoun, emptyMessage) {
    reset();
    return showMatches(names, listNoun, emptyMessage);
  }

  document.querySelector("#show-favorites").addEventListener("click", () => {
    showSavedList(
      storage.getFavorites(),
      "favorite Pokémon",
      "You haven't picked any favorites yet. Open a Pokémon and choose Favorite.",
    );
  });
  document.querySelector("#show-recent").addEventListener("click", () => {
    showSavedList(
      storage.getRecent(),
      "recently viewed Pokémon",
      "Nothing viewed yet. Open a Pokémon to see it here.",
    );
  });

  typeFilter.addEventListener("change", runSearch);
  loadMore.addEventListener("click", showNextPage);

  fillTypeFilter();
  runSearch();

  return { runSearch };
}

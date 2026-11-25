import { findPokemonNames, PAGE_SIZE } from "./search.js";
import { pokemonCardTemplate, formatName } from "./renderer.js";
import { POKEMON_TYPES } from "./pokeapi.js";
import { rankNames } from "./recommend.js";

// The search page: the form, type filter, shortcuts, and the grid of cards.
// api: the pokeapi module; storage: getFavorites() and getRecent()
// team: the Team instance, used to pin Pokémon that fit it
// account: who is logged in and what they own (owned Pokémon get a bonus)
export default function initSearchView({ api, storage, team, account }) {
  const input = document.querySelector("#search-input");
  const typeFilter = document.querySelector("#type-filter");
  const summary = document.querySelector("#result-summary");
  const loader = document.querySelector("#loader");
  const results = document.querySelector("#results");
  const loadMore = document.querySelector("#load-more");
  const ownedOnly = document.querySelector("#owned-only");
  const ownedOnlyLabel = document.querySelector("#owned-only-label");

  // names that match the current search, and how many are on screen
  let matches = [];
  let shown = 0;
  let failedCards = 0;
  // pinned name -> reasons, for the current search
  let recommendations = new Map();
  // the person's Pokémon as of this search: species -> best one they own
  let owned = new Map();
  // how to rebuild a favorites or recently viewed list
  let lastList = null;
  // what the list is called in the summary line
  let noun = "Pokémon";
  // "search" for normal results, "list" for favorites or recently viewed
  let mode = "search";
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
    let pinnedNote = "";
    if (recommendations.size > 0) {
      pinnedNote = " Pokémon that balance your team are listed first.";
      if ([...recommendations.keys()].some((name) => owned.has(name))) {
        pinnedNote += " Ones you own get a boost.";
      }
    }
    summary.textContent = `Showing ${shown} of ${matches.length} ${noun}${failedNote}.${pinnedNote}`;
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
      pokemon
        .map((entry) =>
          pokemonCardTemplate(
            entry,
            recommendations.get(entry.name),
            owned.get(entry.name),
          ),
        )
        .join(""),
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
    recommendations = new Map();
    owned = account.bestBySpecies();
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

  // Pin the Pokémon that fit the team to the front. This is a bonus: if the
  // type data cannot be loaded, the plain results still show.
  async function pinRecommended(names) {
    if (team.members.length === 0 || team.isFull) {
      return { names, recommendations: new Map() };
    }
    try {
      const typeMap = await api.getPokemonTypeMap();
      const teamTypes = team.members
        .map((name) => typeMap[name])
        .filter(Boolean);
      if (teamTypes.length === 0) {
        return { names, recommendations: new Map() };
      }
      return rankNames(names, {
        teamTypes,
        typeMap,
        exclude: new Set(team.members),
        owned,
      });
    } catch (err) {
      return { names, recommendations: new Map() };
    }
  }

  async function runSearch() {
    mode = "search";
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

    // "Only my Pokémon" narrows the list. Without it, owning is just a bonus.
    const shortlist =
      ownedOnly.checked && account.isLoggedIn
        ? names.filter((name) => owned.has(name))
        : names;
    const ranked = await pinRecommended(shortlist);
    if (search !== latestSearch) {
      return;
    }

    recommendations = ranked.recommendations;
    loader.classList.add("hide");
    await showMatches(
      ranked.names,
      "Pokémon",
      ownedOnly.checked && account.isLoggedIn
        ? "None of the Pokémon you own match that search. Clear Only my Pokémon to see everyone."
        : "No Pokémon match that search. Try a shorter name or choose All types.",
    );
  }

  // show a saved list (favorites or recent) in the same grid
  // getNames is called each time, so a rebuilt list reads the latest saved names
  function showSavedList(getNames, listNoun, emptyMessage) {
    mode = "list";
    lastList = { getNames, listNoun, emptyMessage };
    reset();
    return showMatches(getNames(), listNoun, emptyMessage);
  }

  // search again after the team changed, so the pinned Pokémon stay current.
  // A favorites or recent list is left alone.
  function refresh() {
    if (mode === "search") {
      runSearch();
    }
  }

  // after logging in or out, or changing what is owned: redraw whatever list
  // is on screen so the Owned badges and bonuses are current
  function refreshAll() {
    if (mode === "search") {
      runSearch();
    } else if (lastList) {
      showSavedList(
        lastList.getNames,
        lastList.listNoun,
        lastList.emptyMessage,
      );
    }
  }

  // "Only my Pokémon" only makes sense while logged in
  function syncOwnedControl() {
    ownedOnlyLabel.classList.toggle("hide", !account.isLoggedIn);
    if (!account.isLoggedIn) {
      ownedOnly.checked = false;
    }
  }

  document.querySelector("#show-favorites").addEventListener("click", () => {
    showSavedList(
      storage.getFavorites,
      "favorite Pokémon",
      "You haven't picked any favorites yet. Open a Pokémon and choose Favorite.",
    );
  });
  document.querySelector("#show-recent").addEventListener("click", () => {
    showSavedList(
      storage.getRecent,
      "recently viewed Pokémon",
      "Nothing viewed yet. Open a Pokémon to see it here.",
    );
  });

  typeFilter.addEventListener("change", runSearch);
  ownedOnly.addEventListener("change", runSearch);
  account.onChange(syncOwnedControl);
  loadMore.addEventListener("click", showNextPage);

  fillTypeFilter();
  runSearch();

  return { runSearch, refresh, refreshAll };
}

import * as api from "./pokeapi.js";
import { findPokemonNames, PAGE_SIZE } from "./search.js";
import PokemonDetails from "./details.js";
import { pokemonCardTemplate, formatName } from "./renderer.js";

const form = document.querySelector("#search-form");
const input = document.querySelector("#search-input");
const typeFilter = document.querySelector("#type-filter");
const summary = document.querySelector("#result-summary");
const loader = document.querySelector("#loader");
const results = document.querySelector("#results");
const loadMore = document.querySelector("#load-more");

// names that match the current search, and how many are on screen
let matches = [];
let shown = 0;
// bumped on every search so answers to an older search are ignored
let latestSearch = 0;
let failedCards = 0;

function fillTypeFilter() {
  const options = api.POKEMON_TYPES.map(
    (type) => `<option value="${type}">${formatName(type)}</option>`,
  ).join("");
  typeFilter.insertAdjacentHTML("beforeend", options);
}

function updateSummary() {
  const failedNote =
    failedCards > 0 ? ` (${failedCards} could not be loaded)` : "";
  summary.textContent = `Showing ${shown} of ${matches.length} Pokémon${failedNote}`;
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

async function runSearch() {
  latestSearch += 1;
  const search = latestSearch;

  matches = [];
  shown = 0;
  failedCards = 0;
  results.innerHTML = "";
  loadMore.classList.add("hide");
  loader.classList.remove("hide");
  summary.textContent = "Searching…";

  try {
    matches = await findPokemonNames(
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

  if (matches.length === 0) {
    loader.classList.add("hide");
    summary.textContent =
      "No Pokémon match that search. Try a shorter name or choose All types.";
    return;
  }

  await showNextPage();
}

const details = new PokemonDetails(
  document.querySelector("#details-dialog"),
  api,
);
details.init();

form.addEventListener("submit", (event) => {
  event.preventDefault();
  runSearch();
});
typeFilter.addEventListener("change", runSearch);
loadMore.addEventListener("click", showNextPage);

// one listener handles every card, including ones added by "Show more"
results.addEventListener("click", (event) => {
  const button = event.target.closest(".pokemon-card__button");
  if (button) {
    details.open(button.dataset.name);
  }
});

fillTypeFilter();
runSearch();

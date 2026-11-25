import * as api from "./pokeapi.js";
import * as storage from "./storage.js";
import { searchGif } from "./gifapi.js";
import { pulse } from "./animations.js";
import Team from "./teamBuilder.js";
import PokemonDetails from "./details.js";
import initSearchView from "./searchView.js";
import TeamView from "./teamView.js";

// Optional: without a key the team page simply has no reaction GIFs.
// VITE_ variables are public in the browser, so use a key meant for that.
const gifKey = import.meta.env.VITE_GIPHY_API_KEY;

const searchSection = document.querySelector("#search-view");
const teamSection = document.querySelector("#team-view");
const teamLink = document.querySelector("#team-link");
const teamCount = document.querySelector("#team-count");
const form = document.querySelector("#search-form");

const team = new Team(storage);

const details = new PokemonDetails(document.querySelector("#details-dialog"), {
  api,
  team,
  storage,
});
details.init();

const searchView = initSearchView({ api, storage });

const teamView = new TeamView({
  team,
  api,
  storage,
  getGif: (query) => searchGif(query, gifKey),
  openDetails: (name) => details.open(name),
});
teamView.init();

let route = "search";
let firstRoute = true;

// "#/team" shows the team, "#/search" or nothing shows search.
// Other hashes (like the skip link) leave the page where it is.
function showRoute() {
  const { hash } = window.location;
  if (hash === "#/team") {
    route = "team";
  } else if (hash === "#/search" || hash === "") {
    route = "search";
  } else {
    return;
  }

  const onTeam = route === "team";
  searchSection.classList.toggle("hide", onTeam);
  teamSection.classList.toggle("hide", !onTeam);
  if (onTeam) {
    teamLink.setAttribute("aria-current", "page");
  } else {
    teamLink.removeAttribute("aria-current");
  }
  document.title = onTeam
    ? "Your team | Pokémon Team Builder"
    : "Pokémon Team Builder";

  if (onTeam) {
    teamView.render();
  }

  // move focus to the new page's heading, but not on the first load
  if (!firstRoute) {
    const heading = onTeam ? "#team-heading" : "#search-heading";
    document.querySelector(heading).focus();
  }
  firstRoute = false;
}

team.onChange((members, change) => {
  teamCount.textContent = members.length;
  if (change === "add") {
    pulse(teamLink);
  }
  if (route === "team") {
    teamView.render();
  }
});

form.addEventListener("submit", (event) => {
  event.preventDefault();
  // searching from the team page goes back to search first
  if (window.location.hash === "#/team") {
    window.location.hash = "#/search";
  }
  searchView.runSearch();
});

// one listener handles every card, including ones added by "Show more"
document.querySelector("#results").addEventListener("click", (event) => {
  const button = event.target.closest(".pokemon-card__button");
  if (button) {
    details.open(button.dataset.name);
  }
});

// the skip link moves focus without changing the URL, so a reload keeps the page
document.querySelector(".skip-link").addEventListener("click", (event) => {
  event.preventDefault();
  document.querySelector("#main").focus();
});

window.addEventListener("hashchange", showRoute);
teamCount.textContent = team.members.length;
showRoute();

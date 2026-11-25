import * as api from "./pokeapi.js";
import * as storage from "./storage.js";
import { searchGif } from "./gifapi.js";
import { pulse } from "./animations.js";
import * as accountApi from "./accountApi.js";
import Account from "./account.js";
import AuthView from "./authView.js";
import OwnedView from "./ownedView.js";
import Team from "./teamBuilder.js";
import PokemonDetails from "./details.js";
import initSearchView from "./searchView.js";
import TeamView from "./teamView.js";

// Optional: without a key the team page simply has no reaction GIFs.
// VITE_ variables are public in the browser, so use a key meant for that.
const gifKey = import.meta.env.VITE_GIPHY_API_KEY;

const searchSection = document.querySelector("#search-view");
const teamSection = document.querySelector("#team-view");
const ownedSection = document.querySelector("#owned-view");
const ownedLink = document.querySelector("#owned-link");
const teamLink = document.querySelector("#team-link");
const teamCount = document.querySelector("#team-count");
const teamSizeLabel = document.querySelector("#team-size-label");
const form = document.querySelector("#search-form");
const dialog = document.querySelector("#details-dialog");

const team = new Team(storage);

const account = new Account(accountApi);

const details = new PokemonDetails(dialog, {
  api,
  team,
  storage,
  getOwned: (name) => account.bestBySpecies().get(name) ?? null,
});
details.init();

const auth = new AuthView({ account });
auth.init();

const searchView = initSearchView({ api, storage, team, account });

const ownedView = new OwnedView({
  account,
  api,
  auth,
  openDetails: (name) => details.open(name),
});
ownedView.init();

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
// the team changed since the search results were drawn
let searchIsStale = false;
// the login or the owned list changed, which also affects saved lists
let ownedChangedSinceSearch = false;

function refreshSearchIfStale() {
  if (route !== "search") {
    return;
  }
  if (ownedChangedSinceSearch) {
    ownedChangedSinceSearch = false;
    searchIsStale = false;
    searchView.refreshAll();
  } else if (searchIsStale) {
    searchIsStale = false;
    searchView.refresh();
  }
}

// Each page: its section, its heading, its window title, and its nav link.
const PAGES = {
  search: {
    section: searchSection,
    heading: "#search-heading",
    title: "Pokémon Team Builder",
  },
  team: {
    section: teamSection,
    heading: "#team-heading",
    title: "Your team | Pokémon Team Builder",
    link: teamLink,
  },
  owned: {
    section: ownedSection,
    heading: "#owned-heading",
    title: "My Pokémon | Pokémon Team Builder",
    link: ownedLink,
  },
};

const ROUTES = {
  "#/search": "search",
  "": "search",
  "#/team": "team",
  "#/owned": "owned",
};

// Other hashes leave the page where it is.
function showRoute() {
  const next = ROUTES[window.location.hash];
  if (!next) {
    return;
  }
  route = next;

  Object.entries(PAGES).forEach(([name, page]) => {
    page.section.classList.toggle("hide", name !== route);
    if (page.link) {
      if (name === route) {
        page.link.setAttribute("aria-current", "page");
      } else {
        page.link.removeAttribute("aria-current");
      }
    }
  });
  document.title = PAGES[route].title;

  if (route === "team") {
    teamView.render();
  } else if (route === "owned") {
    ownedView.render();
  } else {
    refreshSearchIfStale();
  }

  // move focus to the new page's heading, but not on the first load
  if (!firstRoute) {
    document.querySelector(PAGES[route].heading).focus();
  }
  firstRoute = false;
}

function showTeamCount() {
  teamCount.textContent = team.members.length;
  teamSizeLabel.textContent = team.maxSize;
}

team.onChange((members, change) => {
  showTeamCount();
  searchIsStale = true;
  if (change === "add") {
    pulse(teamLink);
  }
  if (route === "team") {
    teamView.render();
  }
});

// Logging in or out, or changing what is owned, affects the Owned badges and
// the recommendation bonus. Staying logged out changes nothing, so the first
// check for an old session does not redraw the results.
let wasLoggedIn = false;
account.onChange((change) => {
  const changed = change === "owned" || account.isLoggedIn || wasLoggedIn;
  wasLoggedIn = account.isLoggedIn;

  if (changed) {
    ownedChangedSinceSearch = true;
  }
  if (route === "owned") {
    ownedView.render();
  } else {
    refreshSearchIfStale();
  }
});

// the pop-up covers the search results, so update them once it closes
dialog.addEventListener("close", refreshSearchIfStale);

form.addEventListener("submit", (event) => {
  event.preventDefault();
  // searching from the team page goes back to search first
  if (window.location.hash === "#/team") {
    window.location.hash = "#/search";
  }
  searchIsStale = false;
  searchView.runSearch();
});

// one listener handles every card, including ones added by "Show more"
document.querySelector("#results").addEventListener("click", (event) => {
  const button = event.target.closest(".pokemon-card__button");
  if (button) {
    details.open(button.dataset.name, button.dataset.note || "");
  }
});

// the skip link moves focus without changing the URL, so a reload keeps the page
document.querySelector(".skip-link").addEventListener("click", (event) => {
  event.preventDefault();
  document.querySelector("#main").focus();
});

window.addEventListener("hashchange", showRoute);
showTeamCount();
showRoute();

// restore a login from an earlier visit; the pages work without it
account.init();

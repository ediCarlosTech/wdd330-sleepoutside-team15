import {
  detailsTemplate,
  loadingTemplate,
  messageTemplate,
  formatName,
} from "./renderer.js";
import { MAX_TEAM_SIZE } from "./teamBuilder.js";

// the details pop-up, built on the native <dialog> element so Escape,
// focus trapping, and returning focus to the opener come for free
export default class PokemonDetails {
  // api: getPokemon(name), getPokemonDescription(id)
  // team: the Team class instance
  // storage: getFavorites(), setFavorites(names), addRecent(name)
  constructor(dialogElement, { api, team, storage }) {
    this.dialog = dialogElement;
    this.api = api;
    this.team = team;
    this.storage = storage;
    this.content = dialogElement.querySelector("#details-content");
    // the Pokémon being loaded, so a slow answer for an older click is ignored
    this.currentName = null;
    // the Pokémon on screen, once it has loaded
    this.pokemon = null;
  }

  init() {
    // a click on the dark backdrop lands on the <dialog> itself
    this.dialog.addEventListener("click", (event) => {
      if (event.target === this.dialog) {
        this.dialog.close();
      }
    });

    // one listener for the team and favorite buttons
    this.content.addEventListener("click", (event) => {
      const button = event.target.closest("[data-action]");
      if (!button || !this.pokemon) {
        return;
      }
      if (button.dataset.action === "team") {
        this.toggleTeam();
      } else if (button.dataset.action === "favorite") {
        this.toggleFavorite();
      }
    });
  }

  async open(name) {
    this.currentName = name;
    this.pokemon = null;
    this.content.innerHTML = loadingTemplate();
    if (!this.dialog.open) {
      this.dialog.showModal();
    }

    try {
      const pokemon = await this.api.getPokemon(name);
      // the description is a bonus: show the rest if it cannot be loaded
      const description = await this.api
        .getPokemonDescription(pokemon.id)
        .catch(() => "");

      if (this.currentName !== name) {
        return;
      }
      this.pokemon = pokemon;
      this.content.innerHTML = detailsTemplate(pokemon, description);
      this.refreshActions();
      this.storage.addRecent(name);
    } catch (err) {
      if (this.currentName === name) {
        this.content.innerHTML = messageTemplate(
          "We couldn't load this Pokémon. Close this window and try again.",
        );
      }
    }
  }

  say(text) {
    this.content.querySelector(".details__status").textContent = text;
  }

  toggleTeam() {
    const { name } = this.pokemon;
    const displayName = formatName(name);

    if (this.team.has(name)) {
      this.team.remove(name);
      this.say(`${displayName} removed from your team.`);
    } else {
      const result = this.team.add(name);
      this.say(
        result.ok
          ? `${displayName} added to your team (${this.team.members.length} of ${MAX_TEAM_SIZE}).`
          : result.message,
      );
    }
    this.refreshActions();
  }

  toggleFavorite() {
    const { name } = this.pokemon;
    const displayName = formatName(name);
    const favorites = this.storage.getFavorites();
    const isFavorite = favorites.includes(name);
    const updated = isFavorite
      ? favorites.filter((favorite) => favorite !== name)
      : [...favorites, name];

    if (this.storage.setFavorites(updated)) {
      this.say(
        isFavorite
          ? `${displayName} removed from favorites.`
          : `${displayName} added to favorites.`,
      );
    } else {
      this.say(
        "We couldn't save that. Your browser may have storage turned off.",
      );
    }
    this.refreshActions();
  }

  // update the buttons in place so keyboard focus stays where it is
  refreshActions() {
    const { name } = this.pokemon;
    const teamButton = this.content.querySelector('[data-action="team"]');
    const favoriteButton = this.content.querySelector(
      '[data-action="favorite"]',
    );

    teamButton.textContent = this.team.has(name)
      ? "Remove from team"
      : "Add to team";
    favoriteButton.setAttribute(
      "aria-pressed",
      String(this.storage.getFavorites().includes(name)),
    );
  }
}

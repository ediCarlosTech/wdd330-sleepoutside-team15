import {
  detailsTemplate,
  loadingTemplate,
  messageTemplate,
} from "./renderer.js";

// the details pop-up, built on the native <dialog> element so Escape,
// focus trapping, and returning focus to the opener come for free
export default class PokemonDetails {
  constructor(dialogElement, api) {
    // the <dialog> element
    this.dialog = dialogElement;
    // anything with getPokemon(name) and getPokemonDescription(id)
    this.api = api;
    this.content = dialogElement.querySelector("#details-content");
    // the Pokémon being loaded, so a slow answer for an older click is ignored
    this.currentName = null;
  }

  init() {
    // a click on the dark backdrop lands on the <dialog> itself
    this.dialog.addEventListener("click", (event) => {
      if (event.target === this.dialog) {
        this.dialog.close();
      }
    });
  }

  async open(name) {
    this.currentName = name;
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

      if (this.currentName === name) {
        this.content.innerHTML = detailsTemplate(pokemon, description);
      }
    } catch (err) {
      if (this.currentName === name) {
        this.content.innerHTML = messageTemplate(
          "We couldn't load this Pokémon. Close this window and try again.",
        );
      }
    }
  }
}

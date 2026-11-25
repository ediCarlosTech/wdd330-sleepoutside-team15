import { ownedListTemplate, formatName } from "./renderer.js";
import { bodyFromFields } from "./owned.js";
import { prefersReducedMotion } from "./animations.js";

// The "My Pokémon" page: a form to add or edit, and the collection below it.
export default class OwnedView {
  // account: the Account instance
  // api: getPokemonNames() fills the species suggestions
  // auth: the AuthView, used for the log in / delete account pop-ups
  // openDetails(name): shows the Pokémon pop-up
  constructor({ account, api, auth, openDetails }) {
    this.account = account;
    this.api = api;
    this.auth = auth;
    this.openDetails = openDetails;

    this.prompt = document.querySelector("#owned-prompt");
    this.content = document.querySelector("#owned-content");
    this.form = document.querySelector("#owned-form");
    this.formTitle = document.querySelector("#owned-form-title");
    this.saveButton = document.querySelector("#owned-save");
    this.cancelButton = document.querySelector("#owned-cancel");
    this.formMessage = document.querySelector("#owned-form-message");
    this.summary = document.querySelector("#owned-summary");
    this.list = document.querySelector("#owned-list");
    this.speciesInput = document.querySelector("#owned-species");
    this.options = document.querySelector("#species-options");

    // the id being edited, or null when adding
    this.editingId = null;
    this.saving = false;
    // every valid species name, once loaded (null if it could not be loaded)
    this.speciesNames = null;
    this.namesRequested = false;
  }

  init() {
    this.form.addEventListener("submit", (event) => this.submit(event));
    this.cancelButton.addEventListener("click", () => this.stopEditing());

    this.list.addEventListener("click", (event) => {
      const button = event.target.closest("[data-action]");
      if (!button) {
        return;
      }
      const { action, id, name } = button.dataset;
      if (action === "view") {
        this.openDetails(name);
      } else if (action === "edit") {
        this.startEditing(Number(id));
      } else if (action === "remove") {
        this.remove(Number(id));
      }
    });

    document
      .querySelector("#owned-login")
      .addEventListener("click", () => this.auth.open("login"));
    document
      .querySelector("#owned-register")
      .addEventListener("click", () => this.auth.open("register"));
    document
      .querySelector("#delete-account")
      .addEventListener("click", () => this.auth.openDelete());
    this.summary.addEventListener("click", (event) => {
      if (event.target.closest("[data-action='retry']")) {
        this.account.reloadOwned();
      }
    });
  }

  field(name) {
    return this.form.elements[name];
  }

  // draws the right half of the page for the current login state
  render() {
    const { isLoggedIn, ready } = this.account;
    // until the old login has been checked, show neither half
    this.prompt.classList.toggle("hide", isLoggedIn || !ready);
    this.content.classList.toggle("hide", !isLoggedIn);

    if (!isLoggedIn) {
      this.stopEditing(false);
      return;
    }
    this.loadSpeciesNames();
    this.renderList();
  }

  renderList() {
    const { owned, loadError } = this.account;
    if (loadError) {
      this.summary.innerHTML =
        "We couldn't load your Pokémon. " +
        '<button type="button" class="link-button" data-action="retry">Try again</button>';
    } else {
      this.summary.textContent =
        owned.length === 0
          ? "You haven't added any Pokémon yet. Use the form above to add your first."
          : `You are tracking ${owned.length} Pokémon, strongest CP first.`;
    }
    this.list.innerHTML = ownedListTemplate(owned);
  }

  // suggestions for the species box. Missing suggestions are not a problem:
  // the person can still type a name and the server checks its shape.
  async loadSpeciesNames() {
    if (this.namesRequested) {
      return;
    }
    this.namesRequested = true;
    try {
      const names = await this.api.getPokemonNames();
      this.speciesNames = new Set(names);
      this.options.innerHTML = names
        .map((name) => `<option value="${formatName(name)}"></option>`)
        .join("");
    } catch (err) {
      // allow another try next time the page is shown
      this.namesRequested = false;
    }
  }

  say(text, isError = false) {
    this.formMessage.textContent = text;
    this.formMessage.classList.toggle("form-message--error", isError);
  }

  readFields() {
    const fields = {};
    Array.from(this.form.elements).forEach((element) => {
      if (!element.name) {
        return;
      }
      fields[element.name] =
        element.type === "checkbox" ? element.checked : element.value;
    });
    return fields;
  }

  async submit(event) {
    event.preventDefault();
    if (this.saving) {
      return;
    }

    const body = bodyFromFields(this.readFields());
    if (this.speciesNames && !this.speciesNames.has(body.species)) {
      this.say("Choose a Pokémon from the list of suggestions.", true);
      this.speciesInput.focus();
      return;
    }

    this.saving = true;
    this.saveButton.disabled = true;
    const wasEditing = this.editingId !== null;
    const result = await this.account.save(body, this.editingId);
    this.saving = false;
    this.saveButton.disabled = false;

    if (!result.ok) {
      this.say(result.error, true);
      return;
    }
    const name = formatName(body.species);
    this.stopEditing(false);
    this.say(wasEditing ? `Saved changes to ${name}.` : `Added ${name}.`);
    this.speciesInput.focus();
  }

  startEditing(id) {
    const entry = this.account.owned.find((owned) => owned.id === id);
    if (!entry) {
      return;
    }
    this.editingId = id;
    this.form.reset();
    this.field("species").value = formatName(entry.species);
    this.field("nickname").value = entry.nickname ?? "";
    this.field("cp").value = entry.cp ?? "";
    this.field("level").value = entry.level ?? "";
    this.field("ivAttack").value = entry.ivAttack ?? "";
    this.field("ivDefense").value = entry.ivDefense ?? "";
    this.field("ivStamina").value = entry.ivStamina ?? "";
    this.field("fastMove").value = entry.fastMove ?? "";
    this.field("chargedMove1").value = entry.chargedMove1 ?? "";
    this.field("chargedMove2").value = entry.chargedMove2 ?? "";
    this.field("shiny").checked = entry.shiny;
    this.field("shadow").checked = entry.shadow;
    this.field("lucky").checked = entry.lucky;
    this.field("notes").value = entry.notes ?? "";

    this.formTitle.textContent = `Edit ${formatName(entry.species)}`;
    this.saveButton.textContent = "Save changes";
    this.cancelButton.classList.remove("hide");
    this.say("");
    this.form.scrollIntoView({
      behavior: prefersReducedMotion() ? "auto" : "smooth",
      block: "start",
    });
    this.speciesInput.focus({ preventScroll: true });
  }

  // back to adding a new Pokémon. refocus: true when the person pressed Cancel
  stopEditing(refocus = true) {
    this.editingId = null;
    this.form.reset();
    this.formTitle.textContent = "Add a Pokémon";
    this.saveButton.textContent = "Add Pokémon";
    this.cancelButton.classList.add("hide");
    if (refocus) {
      this.say("");
      this.speciesInput.focus();
    }
  }

  async remove(id) {
    const entry = this.account.owned.find((owned) => owned.id === id);
    if (!entry) {
      return;
    }
    const label = entry.nickname || formatName(entry.species);
    if (!window.confirm(`Remove ${label} from your Pokémon?`)) {
      return;
    }
    if (this.editingId === id) {
      this.stopEditing(false);
    }
    const result = await this.account.remove(id);
    if (!result.ok) {
      this.say(result.error, true);
      return;
    }
    this.say(`Removed ${label}.`);
    // the Remove button is gone, so move focus to the list summary
    this.summary.focus();
  }
}

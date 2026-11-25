import {
  slotTemplate,
  emptySlotTemplate,
  unavailableSlotTemplate,
  savedTeamsTemplate,
  analysisTemplate,
  weaknessesTemplate,
  formatName,
} from "./renderer.js";
import { analyzeTeam } from "./teamAnalysis.js";
import TypeDiagram from "./typeDiagram.js";
import MatchupDrill from "./matchupDrill.js";
import { prefersReducedMotion } from "./animations.js";

// The team page: the slots, saving and loading, and the team report.
// team: Team instance; api: getPokemon(name); storage: saved-teams functions
// getGif: (query) => Promise of a gif or null; openDetails: (name) => void
export default class TeamView {
  constructor({ team, api, storage, getGif, openDetails }) {
    this.team = team;
    this.api = api;
    this.storage = storage;
    this.getGif = getGif;
    this.openDetails = openDetails;
    this.slots = document.querySelector("#team-slots");
    this.message = document.querySelector("#team-message");
    this.analysis = document.querySelector("#analysis");
    this.diagram = new TypeDiagram({
      ring: document.querySelector("#diagram-ring"),
      readout: document.querySelector("#diagram-readout"),
    });
    // the weaknesses table lives under the matchup diagram, not in the report
    this.matchups = document.querySelector("#matchups");
    this.drill = new MatchupDrill(this.matchups, { openDetails });
    this.saved = document.querySelector("#saved-teams");
    this.reaction = document.querySelector("#reaction");
    this.nameInput = document.querySelector("#team-name");
    this.sizeSelect = document.querySelector("#team-size");
    // bumped on every draw so an older, slower draw never overwrites a newer one
    this.drawCount = 0;
  }

  init() {
    this.drill.init();
    this.diagram.init();
    this.slots.addEventListener("click", (event) => {
      const remove = event.target.closest(".slot__remove");
      const open = event.target.closest(".slot__open");
      if (remove) {
        this.team.remove(remove.dataset.name);
      } else if (open) {
        this.openDetails(open.dataset.name);
      }
    });

    this.sizeSelect.addEventListener("change", () => this.changeSize());

    document
      .querySelector("#team-save-form")
      .addEventListener("submit", (event) => {
        event.preventDefault();
        this.saveCurrentTeam();
      });

    document.querySelector("#clear-team").addEventListener("click", () => {
      if (
        this.team.members.length > 0 &&
        window.confirm("Remove every Pokémon from your team?")
      ) {
        this.team.clear();
        this.say("Team cleared.");
      }
    });

    this.saved.addEventListener("click", (event) => {
      const button = event.target.closest("[data-action]");
      if (button) {
        this.handleSavedAction(button.dataset.action, button.dataset.id);
      }
    });
  }

  say(text) {
    this.message.textContent = text;
  }

  // a smaller team drops Pokémon from the end, so check before doing it
  changeSize() {
    const size = Number(this.sizeSelect.value);
    const dropped = this.team.membersBeyond(size);

    if (
      dropped.length > 0 &&
      !window.confirm(
        `A team of ${size} removes ${dropped.map(formatName).join(", ")}. Continue?`,
      )
    ) {
      this.sizeSelect.value = String(this.team.maxSize);
      return;
    }
    this.team.setSize(size);
    this.say(`Team size set to ${size}.`);
  }

  saveCurrentTeam() {
    const name = this.nameInput.value.trim();
    if (this.team.members.length === 0) {
      this.say("Add at least one Pokémon before saving your team.");
      return;
    }
    if (!name) {
      this.say("Give your team a name first.");
      this.nameInput.focus();
      return;
    }

    if (this.storage.saveTeam(name, this.team.members, this.team.maxSize)) {
      this.say(`Saved "${name}". Saving with the same name again replaces it.`);
      this.nameInput.value = "";
      this.drawSaved();
    } else {
      this.say(
        "We couldn't save your team. Your browser's storage may be full or turned off.",
      );
    }
  }

  handleSavedAction(action, id) {
    const saved = this.storage.getSavedTeams().find((team) => team.id === id);
    if (!saved) {
      this.drawSaved();
      return;
    }

    if (action === "load") {
      const replacing = this.team.members.length > 0;
      if (
        replacing &&
        !window.confirm(`Replace your current team with "${saved.name}"?`)
      ) {
        return;
      }
      this.team.replace(saved.members, saved.size);
      this.say(`Loaded "${saved.name}".`);
    } else if (action === "delete") {
      if (window.confirm(`Delete the saved team "${saved.name}"?`)) {
        this.storage.deleteSavedTeam(id);
        this.say(`Deleted "${saved.name}".`);
        this.drawSaved();
      }
    }
  }

  drawSaved() {
    this.saved.innerHTML = savedTeamsTemplate(this.storage.getSavedTeams());
  }

  // draw the slots, the report, and the reaction for the current team
  async render() {
    this.drawCount += 1;
    const draw = this.drawCount;
    const names = this.team.members;
    const { maxSize } = this.team;

    this.sizeSelect.value = String(maxSize);
    this.drawSaved();

    // allSettled: one Pokémon that fails to load should not hide the others
    const settled = await Promise.allSettled(
      names.map((name) => this.api.getPokemon(name)),
    );
    if (draw !== this.drawCount) {
      return;
    }
    const loaded = settled.map((result) =>
      result.status === "fulfilled" ? result.value : null,
    );

    const slotHtml = [];
    for (let index = 0; index < maxSize; index += 1) {
      if (!names[index]) {
        slotHtml.push(emptySlotTemplate(index));
      } else if (loaded[index]) {
        slotHtml.push(slotTemplate(loaded[index]));
      } else {
        slotHtml.push(unavailableSlotTemplate(names[index]));
      }
    }
    this.slots.innerHTML = slotHtml.join("");

    const failed = loaded.filter((pokemon) => !pokemon).length;
    if (failed > 0) {
      this.say(`${failed} Pokémon could not be loaded. Check your connection.`);
    }

    const members = loaded.filter(Boolean);
    const analysis = analyzeTeam(members, maxSize);
    this.analysis.innerHTML = analysisTemplate(analysis);
    this.matchups.innerHTML = weaknessesTemplate(analysis);
    this.drill.setRows(analysis.defense);
    this.diagram.render(
      members.map((member) => member.types),
      analysis.coverage,
    );
    this.drawReaction(names);
  }

  // a reaction GIF for the newest teammate, or a celebration for a full team
  async drawReaction(names) {
    const draw = this.drawCount;
    this.reaction.classList.add("hide");
    this.reaction.replaceChildren();
    if (names.length === 0) {
      return;
    }

    const query = this.team.isFull
      ? "pokemon celebration"
      : `${names[names.length - 1]} pokemon`;

    let gif = null;
    try {
      gif = await this.getGif(query);
    } catch (err) {
      // the reaction is a bonus, so a failure just leaves it out
      return;
    }
    // only https images are shown, and only if the team has not changed meanwhile
    if (!gif || !gif.url.startsWith("https://") || draw !== this.drawCount) {
      return;
    }

    const image = document.createElement("img");
    image.src = prefersReducedMotion() ? gif.stillUrl : gif.url;
    image.alt = gif.title || "Pokémon reaction";
    image.height = 200;

    const caption = document.createElement("figcaption");
    caption.textContent = "Powered by GIPHY";

    this.reaction.append(image, caption);
    this.reaction.classList.remove("hide");
  }
}

import { matchupPopoverTemplate } from "./renderer.js";

// How long the pointer has to rest on a row before its Pokémon appear.
// Selecting the type (click, tap, Enter) opens it straight away.
export const HOVER_DELAY_MS = 1200;
// a short grace period so moving from the row onto the panel does not close it
const CLOSE_DELAY_MS = 300;

// The drill-through on the weakness table: rest on a type, or select it, and a
// panel lists your Pokémon that are weak to it, resist it, or are immune.
// One listener set on the container handles every row, even after a redraw.
export default class MatchupDrill {
  // container: the element that holds the report
  // openDetails(name): opens the Pokémon pop-up
  constructor(container, { openDetails, hoverDelay = HOVER_DELAY_MS }) {
    this.container = container;
    this.openDetails = openDetails;
    this.hoverDelay = hoverDelay;
    this.rows = new Map();
    this.openType = null;
    this.hoverTimer = null;
    this.closeTimer = null;
  }

  init() {
    const { container } = this;
    container.addEventListener("mouseover", (event) => this.pointerOver(event));
    container.addEventListener("mouseout", (event) => this.pointerOut(event));
    container.addEventListener("click", (event) => this.clicked(event));
    container.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && this.openType) {
        event.stopPropagation();
        this.close({ refocus: true });
      }
    });
    // anything outside the report closes the panel
    document.addEventListener("click", (event) => {
      if (this.openType && !container.contains(event.target)) {
        this.close();
      }
    });
  }

  // called after every redraw of the report with the analysis rows
  setRows(defense) {
    this.clearTimers();
    this.openType = null;
    this.rows = new Map(defense.map((row) => [row.type, row]));
  }

  clearTimers() {
    clearTimeout(this.hoverTimer);
    clearTimeout(this.closeTimer);
    this.hoverTimer = null;
    this.closeTimer = null;
  }

  popover() {
    return this.container.querySelector("#matchup-popover");
  }

  // the row for a pointer event, if it has anyone to show
  rowFor(target) {
    const row = target.closest?.(".matchups tbody tr[data-type]");
    return row && this.rows.get(row.dataset.type)?.affected?.length > 0
      ? row
      : null;
  }

  pointerOver(event) {
    if (event.target.closest?.(".matchup-popover")) {
      // back on the panel: keep it open
      clearTimeout(this.closeTimer);
      return;
    }
    const row = this.rowFor(event.target);
    if (!row) {
      return;
    }
    clearTimeout(this.closeTimer);
    if (row.dataset.type === this.openType) {
      return;
    }
    clearTimeout(this.hoverTimer);
    this.hoverTimer = setTimeout(
      () => this.open(row.dataset.type),
      this.hoverDelay,
    );
  }

  pointerOut(event) {
    const leaving = event.target.closest?.(
      ".matchups tbody tr, .matchup-popover",
    );
    if (!leaving) {
      return;
    }
    const entering = event.relatedTarget;
    // moving between cells of the same row, or within the panel, is not leaving
    if (entering && leaving.contains(entering)) {
      return;
    }
    clearTimeout(this.hoverTimer);
    if (this.openType && !entering?.closest?.(".matchup-popover")) {
      this.closeTimer = setTimeout(() => this.close(), CLOSE_DELAY_MS);
    }
  }

  clicked(event) {
    const pokemon = event.target.closest(".matchup-popover__pokemon");
    if (pokemon) {
      this.openDetails(pokemon.dataset.name);
      return;
    }
    const toggle = event.target.closest(".matchup__toggle");
    if (!toggle) {
      return;
    }
    if (this.openType === toggle.dataset.type) {
      this.close({ refocus: true });
    } else {
      this.open(toggle.dataset.type);
    }
  }

  open(type) {
    const row = this.rows.get(type);
    const panel = this.popover();
    const tableRow = this.container.querySelector(
      `.matchups tbody tr[data-type="${type}"]`,
    );
    if (!row || !panel || !tableRow) {
      return;
    }
    this.clearTimers();
    this.setExpanded(type);

    panel.innerHTML = matchupPopoverTemplate(row);
    panel.classList.remove("hide");
    // sit just under the row, inside the table's wrapper
    panel.style.top = `${tableRow.offsetTop + tableRow.offsetHeight}px`;
    this.openType = type;
  }

  close({ refocus = false } = {}) {
    const type = this.openType;
    this.clearTimers();
    this.openType = null;
    this.popover()?.classList.add("hide");
    this.setExpanded(null);
    if (refocus && type) {
      this.container
        .querySelector(`.matchup__toggle[data-type="${type}"]`)
        ?.focus();
    }
  }

  setExpanded(openType) {
    this.container.querySelectorAll(".matchup__toggle").forEach((button) => {
      button.setAttribute(
        "aria-expanded",
        String(button.dataset.type === openType),
      );
    });
  }
}

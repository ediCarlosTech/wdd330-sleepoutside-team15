import { TYPES, getMultiplier } from "./teamAnalysis.js";
import { escapeHtml, formatName } from "./renderer.js";

// The matchup diagram: the 18 types around a ring, with arrows from an
// attacking type to each type it hits super effectively. Positions are in
// percent of a square, so the ring scales with the page.
const CENTER = 50;
const RADIUS = 41;
// half the size of a type's label, in the same percent units. Arrows stop at
// the edge of the label instead of running underneath it
const HALF_WIDTH = 6.5;
const HALF_HEIGHT = 2.6;

// "Fire" -> "Fir": the label on narrow screens
function abbreviate(type) {
  return formatName(type).slice(0, 3);
}

// where a type sits on the ring, starting at the top and going clockwise
export function nodePosition(index, count = TYPES.length) {
  const angle = (2 * Math.PI * index) / count - Math.PI / 2;
  return {
    x: CENTER + RADIUS * Math.cos(angle),
    y: CENTER + RADIUS * Math.sin(angle),
  };
}

// Shortens a line so it starts and ends at the edge of each label.
// `gap` leaves a little room for the arrowhead.
export function trimLine(from, to, gap = 0.8) {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  // the fraction of the line that lies inside one label
  const inside = Math.min(
    HALF_WIDTH / Math.max(Math.abs(dx), 1e-9),
    HALF_HEIGHT / Math.max(Math.abs(dy), 1e-9),
  );
  const length = Math.hypot(dx, dy);
  const cut = Math.min(inside, 0.45);
  const tail = Math.min(cut + gap / length, 0.49);
  return {
    x1: from.x + dx * cut,
    y1: from.y + dy * cut,
    x2: to.x - dx * tail,
    y2: to.y - dy * tail,
  };
}

// what a type hits super effectively, and what hits it super effectively
export function typeMatchups(type) {
  return {
    hits: TYPES.filter((defender) => getMultiplier(type, [defender]) > 1),
    hitBy: TYPES.filter((attacker) => getMultiplier(attacker, [type]) > 1),
  };
}

const POSITIONS = new Map(
  TYPES.map((type, index) => [type, nodePosition(index)]),
);

function lineTemplate(attacker, defender, kind) {
  const { x1, y1, x2, y2 } = trimLine(
    POSITIONS.get(attacker),
    POSITIONS.get(defender),
  );
  const round = (value) => value.toFixed(2);
  return `<line class="diagram__line diagram__line--${kind}" x1="${round(x1)}" y1="${round(y1)}" x2="${round(x2)}" y2="${round(y2)}" data-from="${escapeHtml(attacker)}" data-to="${escapeHtml(defender)}" marker-end="url(#diagram-arrow-${kind})" />`;
}

// Which lines to draw. Nothing selected: from each type on the team to each
// type it hits. A type selected: what it hits (solid) and what hits it (dashed).
function linesFor(teamTypes, selected) {
  if (selected) {
    const { hits, hitBy } = typeMatchups(selected);
    return [
      ...hits.map((defender) => lineTemplate(selected, defender, "out")),
      ...hitBy.map((attacker) => lineTemplate(attacker, selected, "in")),
    ];
  }
  return [...new Set(teamTypes.flat())].flatMap((attacker) =>
    typeMatchups(attacker).hits.map((defender) =>
      lineTemplate(attacker, defender, "team"),
    ),
  );
}

function markerTemplate(kind) {
  return `<marker id="diagram-arrow-${kind}" class="diagram__arrow diagram__arrow--${kind}" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="2.6" markerHeight="2.6" markerUnits="userSpaceOnUse" orient="auto"><path d="M0 0 L10 5 L0 10 z" /></marker>`;
}

function nodeTemplate(type, state) {
  const name = escapeHtml(formatName(type));
  const classes = ["diagram__node", "type-badge", `type-${escapeHtml(type)}`];
  const notes = [];
  let mark = "";

  if (state.onTeam) {
    classes.push("diagram__node--team");
    notes.push("on your team");
  }
  if (state.hasTeam) {
    classes.push(
      state.covered ? "diagram__node--covered" : "diagram__node--uncovered",
    );
    notes.push(state.covered ? "covered" : "not covered");
    // a symbol as well as the dashed outline, so color is never the only clue
    mark = `<span class="diagram__mark" aria-hidden="true">${state.covered ? "✓" : "✗"}</span>`;
  }
  if (state.selected) {
    classes.push("diagram__node--selected");
  }
  const hidden = notes.length > 0 ? `, ${notes.join(", ")}` : "";

  return `<button type="button" class="${classes.join(" ")}" data-type="${escapeHtml(type)}" aria-pressed="${state.selected}"><span class="diagram__full">${name}</span><span class="diagram__short" aria-hidden="true">${escapeHtml(abbreviate(type))}</span>${mark}<span class="visually-hidden">${hidden}</span></button>`;
}

// The lines and labels. The labels are real buttons, so the diagram works
// with a keyboard, and the lines are only decoration for what the text says.
// teamTypes: one types array per teammate
// coverage: analyzeTeam().coverage, [{ type, covered }]
export function typeDiagramTemplate({
  teamTypes = [],
  coverage = [],
  selected = null,
} = {}) {
  const onTeam = new Set(teamTypes.flat());
  const covered = new Map(coverage.map((entry) => [entry.type, entry.covered]));
  const hasTeam = teamTypes.length > 0;

  const lines = linesFor(teamTypes, selected).join("");
  const nodes = TYPES.map((type) =>
    nodeTemplate(type, {
      onTeam: onTeam.has(type),
      hasTeam,
      covered: covered.get(type) === true,
      selected: type === selected,
    }),
  ).join("");

  return `<svg class="diagram__lines" viewBox="0 0 100 100" aria-hidden="true" focusable="false"><defs>${["team", "out", "in"].map(markerTemplate).join("")}</defs>${lines}</svg>${nodes}`;
}

function badgesTemplate(types) {
  if (types.length === 0) {
    return "<span>nothing</span>";
  }
  return types
    .map(
      (type) =>
        `<span class="type-badge type-${escapeHtml(type)}">${escapeHtml(formatName(type))}</span>`,
    )
    .join(" ");
}

// The words that go with the picture, for everyone
export function diagramReadoutTemplate({
  teamTypes = [],
  coverage = [],
  selected = null,
} = {}) {
  if (selected) {
    const { hits, hitBy } = typeMatchups(selected);
    const name = escapeHtml(formatName(selected));
    return `<p><strong>${name}</strong> hits super effectively: ${badgesTemplate(hits)}</p>
<p><strong>${name}</strong> is hit super effectively by: ${badgesTemplate(hitBy)}</p>
<button type="button" class="link-button" data-action="clear">Clear selection</button>`;
  }
  if (teamTypes.length === 0) {
    return "<p>Add Pokémon to your team to see which types you cover. You can still select any type to see its matchups.</p>";
  }
  const count = coverage.filter((entry) => entry.covered).length;
  return `<p>Your team's types hit ${count} of ${TYPES.length} types super effectively. Arrows run from each type on your team to the types it hits. Select a type to see its own matchups.</p>`;
}

// Draws the diagram into two elements and handles selecting a type.
// One click listener covers every label, even after a redraw.
export default class TypeDiagram {
  // ring: where the lines and labels go; readout: a status region for the text
  constructor({ ring, readout }) {
    this.ring = ring;
    this.readout = readout;
    this.selected = null;
    this.state = { teamTypes: [], coverage: [] };
  }

  init() {
    const onActivate = (event) => {
      const node = event.target.closest(".diagram__node");
      if (node) {
        this.select(
          node.dataset.type === this.selected ? null : node.dataset.type,
        );
      } else if (event.target.closest("[data-action='clear']")) {
        this.select(null);
      }
    };
    this.ring.addEventListener("click", onActivate);
    this.readout.addEventListener("click", onActivate);
    [this.ring, this.readout].forEach((element) =>
      element.addEventListener("keydown", (event) => {
        if (event.key === "Escape" && this.selected) {
          this.select(null);
        }
      }),
    );
    this.draw();
  }

  // teamTypes: one types array per teammate; coverage from analyzeTeam()
  render(teamTypes, coverage) {
    this.state = { teamTypes, coverage };
    this.draw();
  }

  select(type) {
    const previous = this.selected;
    this.selected = type;
    this.draw();
    // a redraw replaces the buttons, so give focus back to the same one
    const focusType = type ?? previous;
    this.ring.querySelector(`[data-type="${focusType}"]`)?.focus();
  }

  draw() {
    const view = { ...this.state, selected: this.selected };
    this.ring.innerHTML = typeDiagramTemplate(view);
    this.readout.innerHTML = diagramReadoutTemplate(view);
    this.place();
  }

  // Labels are placed with the same numbers the lines use. (A style set from
  // script, not an inline style in the page.)
  place() {
    this.ring.querySelectorAll(".diagram__node").forEach((node) => {
      const { x, y } = POSITIONS.get(node.dataset.type);
      node.style.left = `${x}%`;
      node.style.top = `${y}%`;
    });
  }
}

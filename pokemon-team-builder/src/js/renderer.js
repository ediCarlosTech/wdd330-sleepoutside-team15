import { ivPercent, ivText, describeOwned, sortByCp } from "./owned.js";

// Builds HTML for the page. API text is escaped before it goes into a string.
const STAT_LABELS = {
  hp: "HP",
  attack: "Attack",
  defense: "Defense",
  "special-attack": "Sp. Atk",
  "special-defense": "Sp. Def",
  speed: "Speed",
};

// base stats top out at 255, which is the meter's maximum
const MAX_STAT = 255;

export function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// "mr-mime" -> "Mr Mime"
export function formatName(slug) {
  return slug
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function formatId(id) {
  return `#${String(id).padStart(3, "0")}`;
}

function typeBadgesTemplate(types) {
  return types
    .map(
      (type) =>
        `<span class="type-badge type-${escapeHtml(type)}">${escapeHtml(formatName(type))}</span>`,
    )
    .join("");
}

// reasons: why this Pokémon is recommended for the team, or undefined
// reasons: why it is recommended (or undefined); owned: the person's best one
export function pokemonCardTemplate(pokemon, reasons, owned) {
  const name = escapeHtml(formatName(pokemon.name));
  const note = reasons ? escapeHtml(reasons.join(" ")) : "";

  return `<li class="pokemon-card${reasons ? " pokemon-card--recommended" : ""}">
  <button type="button" class="pokemon-card__button" data-name="${escapeHtml(pokemon.name)}" data-note="${note}">
    <img src="${escapeHtml(pokemon.image)}" alt="" width="120" height="120" loading="lazy" />
    <span class="pokemon-card__id">${formatId(pokemon.id)}</span>
    <span class="pokemon-card__name">${name}</span>
    <span class="type-list">${typeBadgesTemplate(pokemon.types)}</span>
    ${reasons ? '<span class="badge-recommended">Recommended</span>' : ""}
    ${owned ? '<span class="badge-owned">Owned</span>' : ""}
  </button>
</li>`;
}

function statTemplate(stat) {
  const label = STAT_LABELS[stat.name] || formatName(stat.name);
  return `<li>
    <span>${escapeHtml(label)}</span>
    <meter min="0" max="${MAX_STAT}" value="${stat.value}" aria-label="${escapeHtml(label)}">${stat.value}</meter>
    <span>${stat.value}</span>
  </li>`;
}

export function detailsTemplate(
  pokemon,
  description = "",
  note = "",
  owned = null,
) {
  const abilities = pokemon.abilities
    .map(
      (ability) =>
        `<li>${escapeHtml(formatName(ability.name))}${ability.hidden ? " (hidden)" : ""}</li>`,
    )
    .join("");

  return `<img src="${escapeHtml(pokemon.image)}" alt="" width="200" height="200" />
<p class="pokemon-card__id">${formatId(pokemon.id)}</p>
<h2>${escapeHtml(formatName(pokemon.name))}</h2>
<p class="type-list">${typeBadgesTemplate(pokemon.types)}</p>
${description ? `<p>${escapeHtml(description)}</p>` : ""}
${note ? `<p class="details__note">Recommended for your team. ${escapeHtml(note)}</p>` : ""}
${owned ? `<p class="details__owned">You own this Pokémon. Your best: ${escapeHtml(describeOwned(owned))}.</p>` : ""}
<div class="details__actions">
  <button type="button" class="button" data-action="team"></button>
  <button type="button" class="button button--secondary" data-action="favorite" aria-pressed="false">Favorite</button>
</div>
<p class="details__status" role="status"></p>
<dl class="facts">
  <div><dt>Height</dt><dd>${pokemon.height} m</dd></div>
  <div><dt>Weight</dt><dd>${pokemon.weight} kg</dd></div>
</dl>
<h3>Abilities</h3>
<ul class="abilities">${abilities}</ul>
<h3>Base stats</h3>
<ul class="stats">${pokemon.stats.map(statTemplate).join("")}</ul>`;
}

export function loadingTemplate() {
  return `<div class="pokeball-loader" role="status"><span class="visually-hidden">Loading…</span></div>`;
}

export function messageTemplate(text) {
  return `<p class="message">${escapeHtml(text)}</p>`;
}

// ---- team view ----

export function emptySlotTemplate(index) {
  return `<li class="slot slot--empty"><span>Slot ${index + 1}</span><span>Empty</span></li>`;
}

export function slotTemplate(pokemon) {
  const name = escapeHtml(pokemon.name);
  const displayName = escapeHtml(formatName(pokemon.name));

  return `<li class="slot slot--filled">
  <button type="button" class="slot__open" data-name="${name}">
    <img src="${escapeHtml(pokemon.image)}" alt="" width="80" height="80" loading="lazy" />
    <span class="pokemon-card__name">${displayName}</span>
    <span class="type-list">${typeBadgesTemplate(pokemon.types)}</span>
  </button>
  <button type="button" class="slot__remove" data-name="${name}" aria-label="Remove ${displayName} from team">&times;</button>
</li>`;
}

// shown when a saved Pokémon could not be loaded, so it can still be removed
export function unavailableSlotTemplate(pokemonName) {
  const name = escapeHtml(pokemonName);
  const displayName = escapeHtml(formatName(pokemonName));

  return `<li class="slot slot--filled">
  <span class="pokemon-card__name">${displayName}</span>
  <span>Couldn't load</span>
  <button type="button" class="slot__remove" data-name="${name}" aria-label="Remove ${displayName} from team">&times;</button>
</li>`;
}

export function savedTeamsTemplate(teams) {
  if (teams.length === 0) {
    return `<li class="message">No saved teams yet. Name your team above and choose Save team.</li>`;
  }

  return teams
    .map((team) => {
      const name = escapeHtml(team.name);
      const id = escapeHtml(team.id);
      return `<li class="saved">
  <span class="saved__name">${name}</span>
  <span class="saved__size">${team.members.length} Pokémon</span>
  <button type="button" class="button button--secondary" data-action="load" data-id="${id}" aria-label="Load ${name}">Load</button>
  <button type="button" class="button button--secondary" data-action="delete" data-id="${id}" aria-label="Delete ${name}">Delete</button>
</li>`;
    })
    .join("");
}

function defenseRowTemplate(row) {
  const type = escapeHtml(row.type);
  const weak = row.risk ? `${row.weak} (risk)` : row.weak;
  return `<tr${row.risk ? ' class="matchups__risk"' : ""}>
  <th scope="row"><span class="type-badge type-${type}">${escapeHtml(formatName(row.type))}</span></th>
  <td>${weak}</td><td>${row.resist}</td><td>${row.immune}</td>
</tr>`;
}

function coverageItemTemplate(entry) {
  const type = escapeHtml(entry.type);
  return `<li><span class="type-badge type-${type}">${escapeHtml(formatName(entry.type))}</span>
  <span>${entry.covered ? "Covered" : "Not covered"}</span></li>`;
}

// analysis comes from analyzeTeam()
export function analysisTemplate(analysis) {
  if (analysis.size === 0) {
    return messageTemplate("Add Pokémon to your team to see its report.");
  }

  const tips = analysis.suggestions
    .map((tip) => `<li>${escapeHtml(tip)}</li>`)
    .join("");

  return `<h3>Suggestions</h3>
<ul class="tips">${tips}</ul>
<h3>Weaknesses and resistances</h3>
<table class="matchups">
  <caption class="visually-hidden">Pokémon on your team that are weak to, resist, or are immune to each attacking type</caption>
  <thead><tr><th scope="col">Attacking type</th><th scope="col">Weak</th><th scope="col">Resist</th><th scope="col">Immune</th></tr></thead>
  <tbody>${analysis.defense.map(defenseRowTemplate).join("")}</tbody>
</table>
<h3>Type coverage</h3>
<p class="note">Based on your Pokémon's types only. Moves can cover more.</p>
<ul class="coverage">${analysis.coverage.map(coverageItemTemplate).join("")}</ul>`;
}

function ownedFlagsTemplate(entry) {
  const flags = [];
  if (entry.shiny) {
    flags.push("Shiny");
  }
  if (entry.shadow) {
    flags.push("Shadow");
  }
  if (entry.lucky) {
    flags.push("Lucky");
  }
  // words, not just color, so the flags make sense without seeing the badge
  return flags.map((flag) => `<span class="flag">${flag}</span>`).join("");
}

function ownedMovesTemplate(entry) {
  const moves = [entry.fastMove, entry.chargedMove1, entry.chargedMove2].filter(
    Boolean,
  );
  return moves.length > 0
    ? `<p class="owned-card__moves">${moves.map(escapeHtml).join(" · ")}</p>`
    : "";
}

// one Pokémon in the person's collection
export function ownedCardTemplate(entry) {
  const species = escapeHtml(formatName(entry.species));
  const label = entry.nickname
    ? `${escapeHtml(entry.nickname)} (${species})`
    : species;
  const ariaLabel = escapeHtml(
    entry.nickname
      ? `${entry.nickname}, ${formatName(entry.species)}`
      : formatName(entry.species),
  );
  const percent = ivPercent(entry);
  const ivs = ivText(entry);
  const stats = [
    entry.cp !== null ? `<span><strong>CP ${entry.cp}</strong></span>` : "",
    entry.level !== null ? `<span>Level ${entry.level}</span>` : "",
    ivs
      ? `<span>IVs ${ivs}${percent === null ? "" : ` (${percent}%)`}</span>`
      : "",
  ].join("");

  return `<li class="owned-card" data-id="${entry.id}">
  <div class="owned-card__header">
    <h3 class="owned-card__name">${label}</h3>
    ${ownedFlagsTemplate(entry)}
  </div>
  <p class="owned-card__stats">${stats || "No stats entered yet."}</p>
  ${percent === null ? "" : `<meter class="owned-card__iv" min="0" max="100" value="${percent}" aria-label="IV total ${percent} percent">${percent}%</meter>`}
  ${ownedMovesTemplate(entry)}
  ${entry.notes ? `<p class="owned-card__notes">${escapeHtml(entry.notes)}</p>` : ""}
  <div class="owned-card__actions">
    <button type="button" class="button button--secondary" data-action="view" data-name="${escapeHtml(entry.species)}" aria-label="View ${ariaLabel}">View</button>
    <button type="button" class="button button--secondary" data-action="edit" data-id="${entry.id}" aria-label="Edit ${ariaLabel}">Edit</button>
    <button type="button" class="button button--secondary" data-action="remove" data-id="${entry.id}" aria-label="Remove ${ariaLabel}">Remove</button>
  </div>
</li>`;
}

export function ownedListTemplate(list) {
  return sortByCp(list).map(ownedCardTemplate).join("");
}

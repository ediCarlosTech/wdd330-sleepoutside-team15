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

export function pokemonCardTemplate(pokemon) {
  const name = escapeHtml(formatName(pokemon.name));

  return `<li class="pokemon-card">
  <button type="button" class="pokemon-card__button" data-name="${escapeHtml(pokemon.name)}">
    <img src="${escapeHtml(pokemon.image)}" alt="" width="120" height="120" loading="lazy" />
    <span class="pokemon-card__id">${formatId(pokemon.id)}</span>
    <span class="pokemon-card__name">${name}</span>
    <span class="type-list">${typeBadgesTemplate(pokemon.types)}</span>
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

export function detailsTemplate(pokemon, description = "") {
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

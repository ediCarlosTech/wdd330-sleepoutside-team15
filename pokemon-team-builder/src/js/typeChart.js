import { TYPES, getMultiplier } from "./teamAnalysis.js";
import { escapeHtml, formatName } from "./renderer.js";

// "Fire" -> "Fir": short enough for an 18-column grid
function abbreviate(type) {
  return formatName(type).slice(0, 3);
}

function headTemplate(type, onTeam) {
  const name = escapeHtml(formatName(type));
  return `<span class="type-badge type-${escapeHtml(type)}" aria-hidden="true">${escapeHtml(abbreviate(type))}</span><span class="visually-hidden">${name}${onTeam ? " (on your team)" : ""}</span>`;
}

// the symbol is text, so the chart does not rely on color alone
function cellTemplate(multiplier, onTeam) {
  const team = onTeam ? " chart__cell--team" : "";
  if (multiplier === 2) {
    return `<td class="chart__cell chart__cell--super${team}">2×</td>`;
  }
  if (multiplier === 0.5) {
    return `<td class="chart__cell chart__cell--half${team}">½×</td>`;
  }
  if (multiplier === 0) {
    return `<td class="chart__cell chart__cell--none${team}">0×</td>`;
  }
  return `<td class="chart__cell${team}"><span class="visually-hidden">1×</span></td>`;
}

// A grid of the whole type chart. Read across a row to see what an attacking
// type is strong and weak against. Read down a column to see what hits a
// defending type hard. Types on the team are outlined.
// teamTypes: one types array per teammate
export function typeChartTemplate(teamTypes = []) {
  const onTeam = new Set(teamTypes.flat());

  const head = TYPES.map(
    (type) =>
      `<th scope="col" class="chart__head${onTeam.has(type) ? " chart__head--team" : ""}">${headTemplate(type, onTeam.has(type))}</th>`,
  ).join("");

  const rows = TYPES.map((attacker) => {
    const cells = TYPES.map((defender) =>
      cellTemplate(getMultiplier(attacker, [defender]), onTeam.has(defender)),
    ).join("");
    return `<tr><th scope="row" class="chart__head${onTeam.has(attacker) ? " chart__head--team" : ""}">${headTemplate(attacker, onTeam.has(attacker))}</th>${cells}</tr>`;
  }).join("");

  return `<ul class="chart-legend">
  <li><span class="chart__key chart__cell--super">2×</span> super effective</li>
  <li><span class="chart__key chart__cell--half">½×</span> not very effective</li>
  <li><span class="chart__key chart__cell--none">0×</span> no effect</li>
  <li><span class="chart__key chart__head--team">Outlined</span> a type on your team</li>
</ul>
<div class="chart-scroll" role="region" aria-label="Type matchup chart" tabindex="0">
<table class="chart">
  <caption class="visually-hidden">Damage multiplier of each attacking type (rows) against each defending type (columns). Blank cells are normal damage.</caption>
  <thead><tr><th scope="col" class="chart__corner"><span class="chart__corner-text">Attack ↓ Defend →</span></th>${head}</tr></thead>
  <tbody>${rows}</tbody>
</table>
</div>`;
}

import { TYPES, getMultiplier } from "./teamAnalysis.js";
import { formatName } from "./renderer.js";
import { ivShare, describeOwned } from "./owned.js";

// how many Pokémon get pinned to the top of the results
export const RECOMMEND_COUNT = 12;

// A new type to hit is worth half a resisted weakness. Fixing a weakness
// protects the team, while coverage can also come from a Pokémon's moves.
const COVERAGE_WEIGHT = 0.5;

// Owning a Pokémon is a nudge, not a rule. It adds 1 to 2 points (more for
// strong IVs), which can lift a good fit above a slightly better fit you do
// not own, but it never rescues a Pokémon that does not suit the team.
export const OWNED_BONUS = 1;

export function ownedBonus(entry) {
  return OWNED_BONUS + ivShare(entry);
}

// How hard each attacking type hits the team: the number of Pokémon weak to it
// minus the number that resist it, never below zero.
// teamTypes: one types array per teammate, like [["fire"], ["grass", "poison"]]
export function teamExposure(teamTypes) {
  return Object.fromEntries(
    TYPES.map((attackType) => {
      let weak = 0;
      let resist = 0;
      teamTypes.forEach((types) => {
        const multiplier = getMultiplier(attackType, types);
        if (multiplier > 1) {
          weak += 1;
        } else if (multiplier < 1) {
          resist += 1;
        }
      });
      return [attackType, Math.max(0, weak - resist)];
    }),
  );
}

// the types the team's own types already hit super effectively
export function coveredTypes(teamTypes) {
  return new Set(
    TYPES.filter((defender) =>
      teamTypes.some((types) =>
        types.some((own) => getMultiplier(own, [defender]) > 1),
      ),
    ),
  );
}

// Higher is a better fit. A candidate earns points for resisting what the team
// is weak to, and for hitting types the team cannot hit yet. It loses points for
// being weak to what already hurts the team, and a little for any new weakness.
export function scoreCandidate(types, exposure, covered) {
  let score = 0;
  const resisted = [];

  TYPES.forEach((attackType) => {
    const multiplier = getMultiplier(attackType, types);
    const exposed = exposure[attackType];

    if (multiplier < 1 && exposed > 0) {
      score += exposed * (multiplier === 0 ? 1.5 : 1);
      resisted.push({ type: attackType, weight: exposed });
    } else if (multiplier > 1) {
      const quadruple = multiplier >= 4;
      score -=
        exposed > 0 ? exposed * (quadruple ? 1.5 : 1) : quadruple ? 0.5 : 0.25;
    }
  });

  const newCoverage = TYPES.filter(
    (defender) =>
      !covered.has(defender) &&
      types.some((own) => getMultiplier(own, [defender]) > 1),
  );
  score += newCoverage.length * COVERAGE_WEIGHT;

  return {
    score,
    resisted: resisted
      .sort((first, second) => second.weight - first.weight)
      .map((entry) => entry.type),
    newCoverage,
  };
}

// ["Fire"] -> "Fire", ["Fire", "Ice", "Rock"] -> "Fire, Ice and Rock"
function listTypes(types) {
  const names = types.map(formatName);
  if (names.length === 1) {
    return names[0];
  }
  return `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
}

function buildReasons({ resisted, newCoverage, owned }) {
  const reasons = [];
  if (resisted.length > 0) {
    reasons.push(
      `Resists ${listTypes(resisted.slice(0, 3))}, which your team is weak to.`,
    );
  }
  if (newCoverage.length > 0) {
    const more =
      newCoverage.length > 3 ? ` and ${newCoverage.length - 3} more` : "";
    reasons.push(
      `Hits ${listTypes(newCoverage.slice(0, 3))}${more} super effectively, a gap in your team's coverage.`,
    );
  }
  if (owned) {
    reasons.push(`You own one: ${describeOwned(owned)}.`);
  }
  return reasons;
}

// Move the best fits for the team to the front of a list of names.
// names: the list to reorder (its order is kept for ties and for everyone else)
// teamTypes: types of the Pokémon already on the team
// typeMap: from getPokemonTypeMap()
// exclude: a Set of names to leave in place, such as the team itself
// owned: a Map of name -> the best one the person owns, for the owned bonus
// Returns { names, recommendations } where recommendations maps each pinned
// name to its reasons.
export function rankNames(
  names,
  {
    teamTypes,
    typeMap,
    exclude = new Set(),
    owned = new Map(),
    limit = RECOMMEND_COUNT,
  },
) {
  const exposure = teamExposure(teamTypes);
  const covered = coveredTypes(teamTypes);
  const scored = [];

  names.forEach((name) => {
    const types = typeMap[name];
    if (!types || exclude.has(name)) {
      return;
    }
    const result = scoreCandidate(types, exposure, covered);
    // only a Pokémon that already suits the team can earn the owned bonus
    if (result.score > 0) {
      const entry = owned.get(name);
      scored.push({
        name,
        ...result,
        score: entry ? result.score + ownedBonus(entry) : result.score,
        owned: entry,
      });
    }
  });

  // the sort is stable, so equal scores stay in their original order
  scored.sort((first, second) => second.score - first.score);
  const pinned = scored.slice(0, limit);
  const pinnedNames = new Set(pinned.map((entry) => entry.name));

  return {
    names: [
      ...pinned.map((entry) => entry.name),
      ...names.filter((name) => !pinnedNames.has(name)),
    ],
    recommendations: new Map(
      pinned.map((entry) => [entry.name, buildReasons(entry)]),
    ),
  };
}

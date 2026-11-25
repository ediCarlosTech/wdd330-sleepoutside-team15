import { formatName } from "./renderer.js";
import { MAX_TEAM_SIZE } from "./teamBuilder.js";

// For each attacking type: the types it hits double, half, and not at all.
// Anything not listed is hit for normal damage.
const ATTACK_CHART = {
  normal: { double: [], half: ["rock", "steel"], none: ["ghost"] },
  fire: {
    double: ["grass", "ice", "bug", "steel"],
    half: ["fire", "water", "rock", "dragon"],
    none: [],
  },
  water: {
    double: ["fire", "ground", "rock"],
    half: ["water", "grass", "dragon"],
    none: [],
  },
  electric: {
    double: ["water", "flying"],
    half: ["electric", "grass", "dragon"],
    none: ["ground"],
  },
  grass: {
    double: ["water", "ground", "rock"],
    half: ["fire", "grass", "poison", "flying", "bug", "dragon", "steel"],
    none: [],
  },
  ice: {
    double: ["grass", "ground", "flying", "dragon"],
    half: ["fire", "water", "ice", "steel"],
    none: [],
  },
  fighting: {
    double: ["normal", "ice", "rock", "dark", "steel"],
    half: ["poison", "flying", "psychic", "bug", "fairy"],
    none: ["ghost"],
  },
  poison: {
    double: ["grass", "fairy"],
    half: ["poison", "ground", "rock", "ghost"],
    none: ["steel"],
  },
  ground: {
    double: ["fire", "electric", "poison", "rock", "steel"],
    half: ["grass", "bug"],
    none: ["flying"],
  },
  flying: {
    double: ["grass", "fighting", "bug"],
    half: ["electric", "rock", "steel"],
    none: [],
  },
  psychic: {
    double: ["fighting", "poison"],
    half: ["psychic", "steel"],
    none: ["dark"],
  },
  bug: {
    double: ["grass", "psychic", "dark"],
    half: ["fire", "fighting", "poison", "flying", "ghost", "steel", "fairy"],
    none: [],
  },
  rock: {
    double: ["fire", "ice", "flying", "bug"],
    half: ["fighting", "ground", "steel"],
    none: [],
  },
  ghost: { double: ["psychic", "ghost"], half: ["dark"], none: ["normal"] },
  dragon: { double: ["dragon"], half: ["steel"], none: ["fairy"] },
  dark: {
    double: ["psychic", "ghost"],
    half: ["fighting", "dark", "fairy"],
    none: [],
  },
  steel: {
    double: ["ice", "rock", "fairy"],
    half: ["fire", "water", "electric", "steel"],
    none: [],
  },
  fairy: {
    double: ["fighting", "dragon", "dark"],
    half: ["fire", "poison", "steel"],
    none: [],
  },
};

export const TYPES = Object.keys(ATTACK_CHART);

// damage multiplier of one attacking type against a Pokémon's type or types:
// 0, 0.25, 0.5, 1, 2, or 4
export function getMultiplier(attackType, defenderTypes) {
  const chart = ATTACK_CHART[attackType];
  if (!chart) {
    return 1;
  }
  return defenderTypes.reduce((total, defender) => {
    if (chart.none.includes(defender)) {
      return 0;
    }
    if (chart.double.includes(defender)) {
      return total * 2;
    }
    if (chart.half.includes(defender)) {
      return total / 2;
    }
    return total;
  }, 1);
}

// a type is a risk when half the team (at least two Pokémon) is weak to it,
// or two are weak and nothing on the team resists it
function isRisk(row, size) {
  const half = Math.max(2, Math.ceil(size / 2));
  return row.weak >= half || (row.weak >= 2 && row.resist + row.immune === 0);
}

function buildSuggestions(size, maxSize, defense, coverage) {
  if (size === 0) {
    return ["Add Pokémon to your team to get suggestions."];
  }

  const tips = defense
    .filter((row) => row.risk)
    .map(
      (row) =>
        `${row.weak} of ${size} Pokémon are weak to ${formatName(row.type)}. Look for one that resists it.`,
    );

  const missing = coverage
    .filter((entry) => !entry.covered)
    .map((entry) => formatName(entry.type));
  if (missing.length > 0) {
    tips.push(
      `Your Pokémon's types don't hit these types super effectively: ${missing.join(", ")}.`,
    );
  }

  if (size < maxSize) {
    tips.push(`Add ${maxSize - size} more to fill your team.`);
  }

  return tips.length > 0 ? tips : ["No big gaps found. Nice balance."];
}

// members: Pokémon objects with a types array
// maxSize: how many Pokémon the team can hold
export function analyzeTeam(members, maxSize = MAX_TEAM_SIZE) {
  const defense = TYPES.map((attackType) => {
    const row = { type: attackType, weak: 0, resist: 0, immune: 0 };
    members.forEach((member) => {
      const multiplier = getMultiplier(attackType, member.types);
      if (multiplier === 0) {
        row.immune += 1;
      } else if (multiplier > 1) {
        row.weak += 1;
      } else if (multiplier < 1) {
        row.resist += 1;
      }
    });
    row.risk = isRisk(row, members.length);
    return row;
  });

  // a type is covered when one of the team's own types hits it super effectively
  const coverage = TYPES.map((defender) => ({
    type: defender,
    covered: members.some((member) =>
      member.types.some((own) => getMultiplier(own, [defender]) > 1),
    ),
  }));

  return {
    size: members.length,
    defense,
    coverage,
    suggestions: buildSuggestions(members.length, maxSize, defense, coverage),
  };
}

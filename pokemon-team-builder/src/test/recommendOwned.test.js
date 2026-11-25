import { rankNames, ownedBonus, OWNED_BONUS } from "../js/recommend.js";

// against a lone fire Pokémon: gyarados scores 3, squirtle and vaporeon 2,
// pidgey 0.5, and geodude is a poor fit (below zero)
const typeMap = {
  gyarados: ["water", "flying"],
  squirtle: ["water"],
  vaporeon: ["water"],
  pidgey: ["normal", "flying"],
  geodude: ["rock", "ground"],
};
const names = Object.keys(typeMap);
const options = { teamTypes: [["fire"]], typeMap };

const perfectIvs = { ivAttack: 15, ivDefense: 15, ivStamina: 15 };

function ownedMap(entries) {
  return new Map(Object.entries(entries));
}

describe("owned bonus", () => {
  test("is worth more with strong IVs, and average when IVs are unknown", () => {
    expect(ownedBonus({})).toBe(OWNED_BONUS + 0.5);
    expect(ownedBonus(perfectIvs)).toBe(OWNED_BONUS + 1);
    expect(ownedBonus({ ivAttack: 0, ivDefense: 0, ivStamina: 0 })).toBe(
      OWNED_BONUS,
    );
  });
});

describe("rankNames with owned Pokémon", () => {
  test("without owned Pokémon the order is unchanged", () => {
    const plain = rankNames(names, options);
    const empty = rankNames(names, { ...options, owned: new Map() });
    expect(empty.names).toEqual(plain.names);
    expect(plain.names[0]).toBe("gyarados");
  });

  test("owning one lifts a good fit above a slightly better fit you do not own", () => {
    const { names: ranked } = rankNames(names, {
      ...options,
      owned: ownedMap({ squirtle: { cp: 500 } }),
    });
    expect(ranked.indexOf("squirtle")).toBeLessThan(ranked.indexOf("gyarados"));
  });

  test("owned Pokémon do not take over: a much better fit still wins", () => {
    // pidgey fits barely (0.5), so even with perfect IVs it stays behind gyarados
    const { names: ranked } = rankNames(names, {
      ...options,
      owned: ownedMap({ pidgey: perfectIvs }),
    });
    expect(ranked.indexOf("gyarados")).toBeLessThan(ranked.indexOf("pidgey"));
  });

  test("owning a Pokémon that does not suit the team does not pin it", () => {
    const { recommendations } = rankNames(names, {
      ...options,
      owned: ownedMap({ geodude: { cp: 3000, ...perfectIvs } }),
    });
    expect(recommendations.has("geodude")).toBe(false);
  });

  test("stronger IVs rank higher between otherwise equal fits", () => {
    const { names: ranked } = rankNames(["vaporeon", "squirtle"], {
      ...options,
      owned: ownedMap({ vaporeon: {}, squirtle: perfectIvs }),
    });
    expect(ranked).toEqual(["squirtle", "vaporeon"]);
  });

  test("the reasons mention what you own, only for owned Pokémon", () => {
    const { recommendations } = rankNames(names, {
      ...options,
      owned: ownedMap({
        squirtle: { cp: 900, ...perfectIvs },
      }),
    });
    expect(recommendations.get("squirtle").at(-1)).toBe(
      "You own one: CP 900, IVs 15/15/15 (100%).",
    );
    expect(recommendations.get("gyarados").join(" ")).not.toContain("You own");
  });

  test("an owned Pokémon outside the pinned limit is still left in place", () => {
    const { names: ranked, recommendations } = rankNames(names, {
      ...options,
      limit: 1,
      owned: ownedMap({ geodude: {} }),
    });
    expect(recommendations.size).toBe(1);
    expect(ranked).toHaveLength(names.length);
  });
});

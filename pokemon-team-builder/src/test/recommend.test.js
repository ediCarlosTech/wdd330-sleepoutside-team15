import {
  teamExposure,
  coveredTypes,
  scoreCandidate,
  rankNames,
  RECOMMEND_COUNT,
} from "../js/recommend.js";

const fireTeam = [["fire"]];

const typeMap = {
  squirtle: ["water"],
  bulbasaur: ["grass", "poison"],
  geodude: ["rock", "ground"],
  pidgey: ["normal", "flying"],
  charmander: ["fire"],
  eevee: ["normal"],
};

describe("teamExposure", () => {
  test("counts weak Pokémon minus resisting ones, never below zero", () => {
    const exposure = teamExposure([["fire"], ["fire"], ["water"]]);
    // water hits fire x2 but water resists water: 2 weak - 1 resist
    expect(exposure.water).toBe(1);
    // ground and rock hit both fire Pokémon, water resists neither... water: ground neutral
    expect(exposure.ground).toBe(2);
    // fire is resisted by all three: never negative
    expect(exposure.fire).toBe(0);
  });

  test("an empty team has no exposure", () => {
    expect(Object.values(teamExposure([])).every((value) => value === 0)).toBe(
      true,
    );
  });
});

describe("coveredTypes", () => {
  test("is what the team's own types hit super effectively", () => {
    const covered = coveredTypes([["fire"]]);
    expect(covered.has("grass")).toBe(true);
    expect(covered.has("steel")).toBe(true);
    expect(covered.has("water")).toBe(false);
  });
});

describe("scoreCandidate", () => {
  const exposure = teamExposure(fireTeam);
  const covered = coveredTypes(fireTeam);

  test("resisting what hurts the team and covering gaps scores well", () => {
    const squirtle = scoreCandidate(["water"], exposure, covered);
    expect(squirtle.score).toBeGreaterThan(0);
    expect(squirtle.resisted).toContain("water");
    expect(squirtle.newCoverage).toEqual(
      expect.arrayContaining(["fire", "ground", "rock"]),
    );
  });

  test("sharing the team's weaknesses scores worse than resisting them", () => {
    const geodude = scoreCandidate(["rock", "ground"], exposure, covered);
    const squirtle = scoreCandidate(["water"], exposure, covered);
    expect(geodude.score).toBeLessThan(squirtle.score);
  });

  test("an immunity counts for more than a resistance", () => {
    const exposed = { ...teamExposure([]), ground: 2 };
    const flying = scoreCandidate(["flying"], exposed, new Set());
    const grass = scoreCandidate(["grass"], exposed, new Set());
    // flying is immune to ground; grass only resists it
    expect(flying.resisted).toContain("ground");
    expect(grass.resisted).toContain("ground");
    expect(flying.score).toBeGreaterThan(grass.score);
  });
});

describe("rankNames", () => {
  const names = Object.keys(typeMap);
  const options = { teamTypes: fireTeam, typeMap };

  test("pins the best fits first and keeps everyone else in order", () => {
    const { names: ranked, recommendations } = rankNames(names, {
      ...options,
      limit: 2,
    });

    expect(ranked).toHaveLength(names.length);
    expect(new Set(ranked)).toEqual(new Set(names));
    expect([...recommendations.keys()]).toEqual(ranked.slice(0, 2));
    // the Pokémon that were not pinned keep their original relative order
    const rest = ranked.slice(2);
    expect(rest).toEqual(names.filter((name) => rest.includes(name)));
  });

  test("never recommends someone who is excluded, such as a teammate", () => {
    const { recommendations } = rankNames(names, {
      ...options,
      exclude: new Set(["squirtle", "charmander"]),
    });
    expect(recommendations.has("squirtle")).toBe(false);
    expect(recommendations.has("charmander")).toBe(false);
  });

  test("each pinned Pokémon comes with reasons in plain words", () => {
    const { recommendations } = rankNames(names, options);
    const reasons = recommendations.get("squirtle");
    expect(reasons[0]).toBe("Resists Water, which your team is weak to.");
    expect(reasons.join(" ")).toContain("super effectively");
  });

  test("names without type data are left in place, not pinned", () => {
    const { names: ranked, recommendations } = rankNames(
      ["mystery", "squirtle"],
      options,
    );
    expect(recommendations.has("mystery")).toBe(false);
    expect(ranked).toEqual(["squirtle", "mystery"]);
  });

  test("pins at most RECOMMEND_COUNT by default", () => {
    const many = {};
    const manyNames = [];
    for (let index = 0; index < 40; index += 1) {
      many[`water-${index}`] = ["water"];
      manyNames.push(`water-${index}`);
    }
    const { recommendations } = rankNames(manyNames, {
      teamTypes: fireTeam,
      typeMap: many,
    });
    expect(recommendations.size).toBe(RECOMMEND_COUNT);
  });

  test("equal scores keep the original order, so results stay predictable", () => {
    const same = { a: ["water"], b: ["water"], c: ["water"] };
    const { names: ranked } = rankNames(["c", "a", "b"], {
      teamTypes: fireTeam,
      typeMap: same,
    });
    expect(ranked).toEqual(["c", "a", "b"]);
  });

  test("a poor fit is not pinned", () => {
    // a rock type is weak to water and ground, which already hurt a fire team
    const { names: ranked, recommendations } = rankNames(["rocky"], {
      teamTypes: fireTeam,
      typeMap: { rocky: ["rock"] },
    });
    expect(recommendations.size).toBe(0);
    expect(ranked).toEqual(["rocky"]);
  });
});

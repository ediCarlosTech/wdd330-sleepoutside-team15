import { getMultiplier, analyzeTeam, TYPES } from "../js/teamAnalysis.js";

const pikachu = { types: ["electric"] };
const charmander = { types: ["fire"] };

describe("getMultiplier", () => {
  test("single types: super effective, resisted, and immune", () => {
    expect(getMultiplier("fire", ["grass"])).toBe(2);
    expect(getMultiplier("fire", ["water"])).toBe(0.5);
    expect(getMultiplier("ground", ["flying"])).toBe(0);
    expect(getMultiplier("normal", ["fire"])).toBe(1);
  });

  test("dual types multiply together", () => {
    expect(getMultiplier("electric", ["water", "flying"])).toBe(4);
    expect(getMultiplier("fire", ["water", "rock"])).toBe(0.25);
    expect(getMultiplier("fire", ["grass", "water"])).toBe(1);
  });

  test("an immunity wins over a weakness", () => {
    expect(getMultiplier("electric", ["water", "ground"])).toBe(0);
    expect(getMultiplier("normal", ["ghost", "dark"])).toBe(0);
  });

  test("an unknown type is treated as normal damage", () => {
    expect(getMultiplier("shadow", ["fire"])).toBe(1);
    expect(getMultiplier("fire", ["stellar"])).toBe(1);
  });
});

describe("analyzeTeam", () => {
  test("covers all 18 types in both lists", () => {
    const analysis = analyzeTeam([pikachu]);
    expect(TYPES).toHaveLength(18);
    expect(analysis.defense).toHaveLength(18);
    expect(analysis.coverage).toHaveLength(18);
  });

  test("counts weak, resist, and immune Pokémon per attacking type", () => {
    const { defense } = analyzeTeam([pikachu, charmander]);
    const row = (type) => defense.find((entry) => entry.type === type);

    // Ground hits both double
    expect(row("ground")).toMatchObject({ weak: 2, resist: 0, immune: 0 });
    // Steel is resisted by both
    expect(row("steel")).toMatchObject({ weak: 0, resist: 2 });
    // Electric is resisted by Pikachu only
    expect(row("electric")).toMatchObject({ weak: 0, resist: 1 });
  });

  test("a type three Pokémon are weak to is flagged as a risk", () => {
    const analysis = analyzeTeam([charmander, charmander, charmander]);
    const water = analysis.defense.find((entry) => entry.type === "water");

    expect(water.risk).toBe(true);
    expect(analysis.suggestions[0]).toContain(
      "3 of 3 Pokémon are weak to Water",
    );
  });

  test("one weak Pokémon is not a risk", () => {
    const analysis = analyzeTeam([pikachu]);
    expect(analysis.defense.find((entry) => entry.type === "ground").risk).toBe(
      false,
    );
  });

  test("coverage uses the team's own types", () => {
    const { coverage } = analyzeTeam([pikachu]);
    const covered = (type) =>
      coverage.find((entry) => entry.type === type).covered;

    expect(covered("water")).toBe(true);
    expect(covered("flying")).toBe(true);
    expect(covered("fire")).toBe(false);
  });

  test("an empty team gets a prompt instead of a report", () => {
    const analysis = analyzeTeam([]);
    expect(analysis.size).toBe(0);
    expect(analysis.suggestions).toEqual([
      "Add Pokémon to your team to get suggestions.",
    ]);
  });

  test("a short team is told how many more to add", () => {
    const { suggestions } = analyzeTeam([pikachu, charmander]);
    expect(suggestions).toContain("Add 4 more to fill your team.");
  });
});

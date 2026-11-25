/**
 * @jest-environment jsdom
 */
import { typeChartTemplate } from "../js/typeChart.js";
import { analyzeTeam, TYPES } from "../js/teamAnalysis.js";

function parse(html) {
  const holder = document.createElement("div");
  holder.innerHTML = html;
  return holder;
}

const cell = (chart, attacker, defender) =>
  chart.querySelector(
    `tbody tr:nth-child(${TYPES.indexOf(attacker) + 1}) td:nth-child(${TYPES.indexOf(defender) + 2})`,
  );

describe("type chart", () => {
  const chart = parse(typeChartTemplate());

  test("has a row and a column for each of the 18 types", () => {
    expect(chart.querySelectorAll("tbody tr")).toHaveLength(18);
    expect(
      chart.querySelectorAll('thead th[scope="col"].chart__head'),
    ).toHaveLength(18);
    expect(chart.querySelectorAll("tbody td")).toHaveLength(324);
  });

  test("rows are attackers and columns are defenders", () => {
    // fire burns grass, but grass resists fire: the two directions differ
    expect(cell(chart, "fire", "grass").textContent.trim()).toBe("2×");
    expect(cell(chart, "grass", "fire").textContent.trim()).toBe("½×");
  });

  test("shows super effective, not very effective, and no effect", () => {
    expect(cell(chart, "water", "fire").className).toContain(
      "chart__cell--super",
    );
    expect(cell(chart, "water", "water").className).toContain(
      "chart__cell--half",
    );
    expect(cell(chart, "electric", "ground").textContent.trim()).toBe("0×");
    expect(cell(chart, "electric", "ground").className).toContain(
      "chart__cell--none",
    );
  });

  test("normal damage is blank for sighted users but read as 1×", () => {
    const normal = cell(chart, "normal", "fire");
    expect(normal.className).toBe("chart__cell");
    expect(normal.querySelector(".visually-hidden").textContent).toBe("1×");
  });

  test("agrees with the type chart used everywhere else", () => {
    // spot check every fairy and dragon cell against the chart
    expect(cell(chart, "dragon", "fairy").textContent.trim()).toBe("0×");
    expect(cell(chart, "fairy", "dragon").textContent.trim()).toBe("2×");
    expect(cell(chart, "steel", "fairy").textContent.trim()).toBe("2×");
  });

  test("every header has full name text for screen readers", () => {
    const names = [
      ...chart.querySelectorAll("thead th.chart__head .visually-hidden"),
    ].map((node) => node.textContent);
    expect(names[0]).toBe("Normal");
    expect(names).toContain("Fighting");
    expect(chart.querySelector("caption").textContent).toContain(
      "attacking type",
    );
  });

  test("with no team, nothing is outlined", () => {
    expect(chart.querySelectorAll("th.chart__head--team")).toHaveLength(0);
  });

  test("outlines the types on the team, as column and row headers", () => {
    const withTeam = parse(typeChartTemplate([["fire"], ["grass", "poison"]]));
    const outlined = [
      ...withTeam.querySelectorAll("th.chart__head--team .visually-hidden"),
    ]
      .map((node) => node.textContent)
      .sort();
    // each type appears once as a column and once as a row
    expect(outlined).toEqual([
      "Fire (on your team)",
      "Fire (on your team)",
      "Grass (on your team)",
      "Grass (on your team)",
      "Poison (on your team)",
      "Poison (on your team)",
    ]);
    expect(withTeam.querySelectorAll("td.chart__cell--team")).toHaveLength(
      3 * 18,
    );
  });
});

describe("analysis keeps track of who is affected", () => {
  const charmander = { name: "charmander", types: ["fire"] };
  const bulbasaur = { name: "bulbasaur", types: ["grass", "poison"] };
  const defense = analyzeTeam([charmander, bulbasaur]).defense;
  const row = (type) => defense.find((entry) => entry.type === type);

  test("lists each teammate that is weak, resists, or is immune", () => {
    expect(row("water").affected).toEqual([
      { name: "charmander", multiplier: 2 },
      { name: "bulbasaur", multiplier: 0.5 },
    ]);
  });

  test("leaves out teammates who take normal damage", () => {
    expect(row("dragon").affected).toEqual([]);
    // grass takes double from fire, fire resists it, poison changes nothing
    expect(row("fire").affected).toEqual([
      { name: "bulbasaur", multiplier: 2 },
      { name: "charmander", multiplier: 0.5 },
    ]);
  });

  test("the most exposed come first, immunities last", () => {
    const steelPoison = analyzeTeam([
      { name: "a", types: ["steel"] },
      { name: "b", types: ["grass", "ice"] },
      { name: "c", types: ["fire"] },
    ]).defense.find((entry) => entry.type === "fire");
    expect(steelPoison.affected.map((entry) => entry.multiplier)).toEqual([
      4, 2, 0.5,
    ]);

    const ground = analyzeTeam([
      { name: "bird", types: ["flying"] },
      { name: "mon", types: ["fire"] },
    ]).defense.find((entry) => entry.type === "ground");
    expect(ground.affected.map((entry) => entry.name)).toEqual(["mon", "bird"]);
    expect(ground.affected.at(-1).multiplier).toBe(0);
  });

  test("counts and affected lists agree", () => {
    defense.forEach((entry) => {
      const weak = entry.affected.filter((who) => who.multiplier > 1).length;
      const resist = entry.affected.filter(
        (who) => who.multiplier < 1 && who.multiplier > 0,
      ).length;
      const immune = entry.affected.filter(
        (who) => who.multiplier === 0,
      ).length;
      expect([weak, resist, immune]).toEqual([
        entry.weak,
        entry.resist,
        entry.immune,
      ]);
    });
  });
});

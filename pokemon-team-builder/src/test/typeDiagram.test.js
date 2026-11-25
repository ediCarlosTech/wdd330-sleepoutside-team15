/**
 * @jest-environment jsdom
 */
import TypeDiagram, {
  typeDiagramTemplate,
  diagramReadoutTemplate,
  nodePosition,
  trimLine,
  typeMatchups,
} from "../js/typeDiagram.js";
import { analyzeTeam, TYPES } from "../js/teamAnalysis.js";

const pikachu = { name: "pikachu", types: ["electric"] };
const charizard = { name: "charizard", types: ["fire", "flying"] };

function parse(html) {
  const holder = document.createElement("div");
  holder.innerHTML = html;
  return holder;
}

function viewFor(members, selected = null) {
  return {
    teamTypes: members.map((member) => member.types),
    coverage: analyzeTeam(members).coverage,
    selected,
  };
}

const lines = (holder) =>
  [...holder.querySelectorAll(".diagram__line")].map(
    (line) => `${line.dataset.from}>${line.dataset.to}`,
  );

describe("type matchups", () => {
  test("lists what a type hits and what hits it", () => {
    const fire = typeMatchups("fire");
    expect(fire.hits.sort()).toEqual(["bug", "grass", "ice", "steel"]);
    expect(fire.hitBy.sort()).toEqual(["ground", "rock", "water"]);
  });

  test("a type with no super effective hits gets an empty list", () => {
    expect(typeMatchups("normal").hits).toEqual([]);
  });
});

describe("diagram geometry", () => {
  test("types start at the top and go clockwise around a ring", () => {
    const top = nodePosition(0);
    const quarter = nodePosition(TYPES.length / 4);
    expect(top.x).toBeCloseTo(50);
    expect(top.y).toBeLessThan(50);
    expect(quarter.x).toBeGreaterThan(50);
    expect(quarter.y).toBeCloseTo(50);
  });

  test("every position fits inside the square", () => {
    TYPES.forEach((_type, index) => {
      const { x, y } = nodePosition(index);
      [x, y].forEach((value) => {
        expect(value).toBeGreaterThan(5);
        expect(value).toBeLessThan(95);
      });
    });
  });

  test("a line is shortened at both ends so arrows are not hidden", () => {
    const from = { x: 10, y: 50 };
    const to = { x: 90, y: 50 };
    const line = trimLine(from, to);
    expect(line.x1).toBeGreaterThan(from.x);
    expect(line.x2).toBeLessThan(to.x);
    expect(line.y1).toBeCloseTo(50);
    expect(line.y2).toBeCloseTo(50);
  });

  test("lines between neighbors still have a visible length", () => {
    const line = trimLine(nodePosition(0), nodePosition(1));
    expect(Math.hypot(line.x2 - line.x1, line.y2 - line.y1)).toBeGreaterThan(0);
  });
});

describe("diagram drawing", () => {
  test("has a button for each of the 18 types, named in full", () => {
    const holder = parse(typeDiagramTemplate());
    const buttons = holder.querySelectorAll("button.diagram__node");
    expect(buttons).toHaveLength(18);
    expect(buttons[0].querySelector(".diagram__full").textContent).toBe(
      TYPES[0][0].toUpperCase() + TYPES[0].slice(1),
    );
    // the three-letter label is hidden from screen readers
    expect(
      buttons[0].querySelector(".diagram__short").getAttribute("aria-hidden"),
    ).toBe("true");
  });

  test("the lines are decoration, hidden from screen readers", () => {
    const svg = parse(typeDiagramTemplate()).querySelector("svg");
    expect(svg.getAttribute("aria-hidden")).toBe("true");
  });

  test("an empty team has no lines and no covered marks", () => {
    const holder = parse(typeDiagramTemplate(viewFor([])));
    expect(holder.querySelectorAll(".diagram__line")).toHaveLength(0);
    expect(holder.querySelectorAll(".diagram__mark")).toHaveLength(0);
  });

  test("with a team, arrows run from the team's types to what they hit", () => {
    const holder = parse(typeDiagramTemplate(viewFor([pikachu])));
    expect(lines(holder).sort()).toEqual(["electric>flying", "electric>water"]);
  });

  test("a type shared by two teammates is drawn once", () => {
    const holder = parse(typeDiagramTemplate(viewFor([pikachu, pikachu])));
    expect(holder.querySelectorAll(".diagram__line")).toHaveLength(2);
  });

  test("covered and not covered types get a symbol and a word, not just color", () => {
    const holder = parse(typeDiagramTemplate(viewFor([pikachu])));
    const node = (type) => holder.querySelector(`[data-type="${type}"]`);

    expect(node("water").className).toContain("diagram__node--covered");
    expect(node("water").querySelector(".diagram__mark").textContent).toBe("✓");
    expect(node("water").textContent).toContain("covered");

    expect(node("fire").className).toContain("diagram__node--uncovered");
    expect(node("fire").querySelector(".diagram__mark").textContent).toBe("✗");
    expect(node("fire").textContent).toContain("not covered");
  });

  test("types on the team are outlined and named as such", () => {
    const holder = parse(typeDiagramTemplate(viewFor([charizard])));
    const onTeam = [...holder.querySelectorAll(".diagram__node--team")].map(
      (node) => node.dataset.type,
    );
    expect(onTeam.sort()).toEqual(["fire", "flying"]);
    expect(holder.querySelector('[data-type="fire"]').textContent).toContain(
      "on your team",
    );
  });

  test("selecting a type shows what it hits (solid) and what hits it (dashed)", () => {
    const holder = parse(typeDiagramTemplate(viewFor([pikachu], "fire")));
    const kinds = (kind) =>
      [...holder.querySelectorAll(`.diagram__line--${kind}`)].map(
        (line) => `${line.dataset.from}>${line.dataset.to}`,
      );

    expect(kinds("out").sort()).toEqual([
      "fire>bug",
      "fire>grass",
      "fire>ice",
      "fire>steel",
    ]);
    expect(kinds("in").sort()).toEqual([
      "ground>fire",
      "rock>fire",
      "water>fire",
    ]);
    // the team's own arrows step aside while a type is selected
    expect(holder.querySelectorAll(".diagram__line--team")).toHaveLength(0);
    expect(
      holder.querySelector('[data-type="fire"]').getAttribute("aria-pressed"),
    ).toBe("true");
    expect(
      holder.querySelector('[data-type="water"]').getAttribute("aria-pressed"),
    ).toBe("false");
  });

  test("escapes anything it prints", () => {
    const holder = parse(typeDiagramTemplate({ selected: '"><img src=x>' }));
    expect(holder.querySelector("img")).toBeNull();
  });
});

describe("the words beside the diagram", () => {
  test("ask for a team when there is none", () => {
    expect(diagramReadoutTemplate(viewFor([]))).toContain("Add Pokémon");
  });

  test("count what the team covers", () => {
    const view = viewFor([pikachu]);
    expect(diagramReadoutTemplate(view)).toContain("hit 2 of 18");
  });

  test("a selected type lists its matchups as text", () => {
    const text = parse(diagramReadoutTemplate(viewFor([], "fire"))).textContent;
    expect(text).toMatch(/Fire hits super effectively:.*Grass.*Ice/);
    expect(text).toMatch(
      /Fire is hit super effectively by:.*Water.*Ground.*Rock/,
    );
  });

  test("a type that hits nothing says so", () => {
    expect(diagramReadoutTemplate({ selected: "normal" })).toContain("nothing");
  });
});

describe("TypeDiagram", () => {
  function setup() {
    document.body.innerHTML =
      '<div id="ring"></div><div id="readout" role="status"></div>';
    const ring = document.querySelector("#ring");
    const readout = document.querySelector("#readout");
    const diagram = new TypeDiagram({ ring, readout });
    diagram.init();
    diagram.render(...Object.values(viewFor([pikachu])).slice(0, 2));
    return { ring, readout, diagram };
  }

  const node = (ring, type) => ring.querySelector(`[data-type="${type}"]`);

  test("places every label with a position", () => {
    const { ring } = setup();
    ring.querySelectorAll(".diagram__node").forEach((button) => {
      expect(button.style.left).toMatch(/%$/);
      expect(button.style.top).toMatch(/%$/);
    });
  });

  test("clicking a type selects it, and clicking it again clears it", () => {
    const { ring, readout } = setup();
    node(ring, "fire").click();
    expect(node(ring, "fire").getAttribute("aria-pressed")).toBe("true");
    expect(readout.textContent).toContain("Fire hits super effectively");

    node(ring, "fire").click();
    expect(node(ring, "fire").getAttribute("aria-pressed")).toBe("false");
    expect(readout.textContent).toContain("hit 2 of 18");
  });

  test("selecting another type switches to it", () => {
    const { ring } = setup();
    node(ring, "fire").click();
    node(ring, "water").click();
    expect(node(ring, "fire").getAttribute("aria-pressed")).toBe("false");
    expect(node(ring, "water").getAttribute("aria-pressed")).toBe("true");
  });

  test("keeps focus on the same button after the redraw", () => {
    const { ring } = setup();
    document.body.append(ring);
    node(ring, "fire").click();
    expect(document.activeElement).toBe(node(ring, "fire"));
  });

  test("Escape and the Clear button both clear the selection", () => {
    const { ring, readout } = setup();
    node(ring, "fire").click();
    node(ring, "fire").dispatchEvent(
      new KeyboardEvent("keydown", { key: "Escape", bubbles: true }),
    );
    expect(readout.textContent).not.toContain("Fire hits");

    node(ring, "fire").click();
    readout.querySelector("[data-action='clear']").click();
    expect(readout.textContent).not.toContain("Fire hits");
  });

  test("a selection survives the team changing", () => {
    const { ring, diagram } = setup();
    node(ring, "fire").click();
    diagram.render([["fire"]], analyzeTeam([charizard]).coverage);
    expect(node(ring, "fire").getAttribute("aria-pressed")).toBe("true");
    expect(node(ring, "fire").className).toContain("diagram__node--team");
  });
});

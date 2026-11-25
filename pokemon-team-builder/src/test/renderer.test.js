import {
  escapeHtml,
  formatName,
  pokemonCardTemplate,
  detailsTemplate,
} from "../js/renderer.js";

const pokemon = {
  id: 7,
  name: "squirtle",
  types: ["water"],
  image: "squirtle.png",
  height: 0.5,
  weight: 9,
  stats: [{ name: "special-attack", value: 50 }],
  abilities: [{ name: "torrent", hidden: false }],
};

test("escapeHtml neutralizes markup", () => {
  expect(escapeHtml(`<img src="x" onerror='y'>&`)).toBe(
    "&lt;img src=&quot;x&quot; onerror=&#39;y&#39;&gt;&amp;",
  );
});

test("formatName turns slugs into readable names", () => {
  expect(formatName("mr-mime")).toBe("Mr Mime");
  expect(formatName("pikachu")).toBe("Pikachu");
});

test("the card shows number, name, and type, and carries the name for clicks", () => {
  const html = pokemonCardTemplate(pokemon);
  expect(html).toContain("#007");
  expect(html).toContain("Squirtle");
  expect(html).toContain("type-water");
  expect(html).toContain(`data-name="squirtle"`);
});

test("the card does not let a hostile name break out of the markup", () => {
  const html = pokemonCardTemplate({ ...pokemon, name: "<script>x</script>" });
  expect(html).not.toContain("<script>");
});

test("details show stats with readable labels and the description", () => {
  const html = detailsTemplate(pokemon, "A tiny turtle.");
  expect(html).toContain("Sp. Atk");
  expect(html).toContain("A tiny turtle.");
  expect(html).toContain("0.5 m");
});

describe("team templates", () => {
  const withTemplates = async () => import("../js/renderer.js");

  test("a filled slot has an accessible remove button", async () => {
    const { slotTemplate } = await withTemplates();
    const html = slotTemplate(pokemon);
    expect(html).toContain('aria-label="Remove Squirtle from team"');
    expect(html).toContain('data-name="squirtle"');
  });

  test("an empty slot is numbered from one", async () => {
    const { emptySlotTemplate } = await withTemplates();
    expect(emptySlotTemplate(0)).toContain("Slot 1");
    expect(emptySlotTemplate(5)).toContain("Slot 6");
  });

  test("saved team names cannot break out of the markup", async () => {
    const { savedTeamsTemplate } = await withTemplates();
    const html = savedTeamsTemplate([
      { id: "1", name: '<img src=x onerror="y">', members: ["a", "b"] },
    ]);
    expect(html).not.toContain("<img");
    expect(html).toContain("2 Pokémon");
  });

  test("with no saved teams the list explains what to do", async () => {
    const { savedTeamsTemplate } = await withTemplates();
    expect(savedTeamsTemplate([])).toContain("No saved teams yet");
  });

  test("the report marks risky types in words, not only color", async () => {
    const { analysisTemplate } = await withTemplates();
    const html = analysisTemplate({
      size: 3,
      suggestions: ["Tip one."],
      defense: [{ type: "water", weak: 3, resist: 0, immune: 0, risk: true }],
      coverage: [{ type: "fire", covered: false }],
    });
    expect(html).toContain("3 (risk)");
    expect(html).toContain("Not covered");
    expect(html).toContain("Tip one.");
  });

  test("an empty team shows a prompt instead of a report", async () => {
    const { analysisTemplate } = await withTemplates();
    expect(analysisTemplate({ size: 0 })).toContain("Add Pokémon to your team");
  });

  test("details include team and favorite buttons", () => {
    const html = detailsTemplate(pokemon, "");
    expect(html).toContain('data-action="team"');
    expect(html).toContain('data-action="favorite"');
  });
});

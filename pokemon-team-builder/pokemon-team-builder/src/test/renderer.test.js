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

import {
  pokemonCardTemplate,
  detailsTemplate,
  ownedCardTemplate,
  ownedListTemplate,
} from "../js/renderer.js";

const pokemon = {
  id: 25,
  name: "pikachu",
  image: "https://example.com/25.png",
  types: ["electric"],
  abilities: [{ name: "static", hidden: false }],
  stats: [{ name: "hp", value: 35 }],
  height: 0.4,
  weight: 6,
};

const entry = {
  id: 4,
  species: "pikachu",
  nickname: "Sparky",
  cp: 1500,
  level: 30.5,
  ivAttack: 15,
  ivDefense: 14,
  ivStamina: 13,
  fastMove: "Thunder Shock",
  chargedMove1: "Wild Charge",
  chargedMove2: null,
  shiny: true,
  shadow: false,
  lucky: true,
  notes: "Best buddy",
};

describe("Owned badge on search cards", () => {
  test("shows only when the person owns it", () => {
    expect(pokemonCardTemplate(pokemon, undefined, entry)).toContain(
      'class="badge-owned"',
    );
    expect(pokemonCardTemplate(pokemon)).not.toContain("badge-owned");
  });

  test("can show Recommended and Owned together", () => {
    const html = pokemonCardTemplate(pokemon, ["Good fit."], entry);
    expect(html).toContain("badge-recommended");
    expect(html).toContain("badge-owned");
  });
});

describe("details pop-up", () => {
  test("says what the person owns", () => {
    const html = detailsTemplate(pokemon, "", "", entry);
    expect(html).toContain("You own this Pokémon");
    expect(html).toContain("CP 1500, IVs 15/14/13 (93%)");
  });

  test("says nothing when they do not own it", () => {
    expect(detailsTemplate(pokemon)).not.toContain("You own");
  });
});

describe("owned card", () => {
  test("shows name, CP, level, IVs, moves, flags and notes", () => {
    const html = ownedCardTemplate(entry);
    expect(html).toContain("Sparky (Pikachu)");
    expect(html).toContain("CP 1500");
    expect(html).toContain("Level 30.5");
    expect(html).toContain("IVs 15/14/13 (93%)");
    expect(html).toContain("Thunder Shock · Wild Charge");
    expect(html).toContain(">Shiny<");
    expect(html).toContain(">Lucky<");
    expect(html).not.toContain(">Shadow<");
    expect(html).toContain("Best buddy");
  });

  test("has a meter for the IV total with a text label", () => {
    const html = ownedCardTemplate(entry);
    expect(html).toContain('value="93"');
    expect(html).toContain('aria-label="IV total 93 percent"');
  });

  test("handles a Pokémon with only a species", () => {
    const html = ownedCardTemplate({
      id: 9,
      species: "mr-mime",
      nickname: null,
      cp: null,
      level: null,
      ivAttack: null,
      ivDefense: null,
      ivStamina: null,
      fastMove: null,
      chargedMove1: null,
      chargedMove2: null,
      shiny: false,
      shadow: false,
      lucky: false,
      notes: null,
    });
    expect(html).toContain("Mr Mime");
    expect(html).toContain("No stats entered yet.");
    expect(html).not.toContain("<meter");
    expect(html).not.toContain("owned-card__moves");
  });

  test("buttons name the Pokémon for screen readers and carry the ids", () => {
    const html = ownedCardTemplate(entry);
    expect(html).toContain('aria-label="Edit Sparky, Pikachu"');
    expect(html).toContain('data-action="remove" data-id="4"');
    expect(html).toContain('data-action="view" data-name="pikachu"');
  });

  test("text typed by the person cannot inject HTML", () => {
    const html = ownedCardTemplate({
      ...entry,
      nickname: '<img src=x onerror="alert(1)">',
      fastMove: "<script>bad()</script>",
      notes: "</p><b>hi</b>",
    });
    expect(html).not.toContain("<img src=x");
    expect(html).not.toContain("<script>");
    expect(html).not.toContain("<b>hi</b>");
    expect(html).toContain("&lt;img");
  });

  test("the list is sorted by CP, strongest first", () => {
    const html = ownedListTemplate([
      { ...entry, id: 1, species: "weedle", nickname: null, cp: 100 },
      { ...entry, id: 2, species: "mewtwo", nickname: null, cp: 4000 },
    ]);
    expect(html.indexOf("Mewtwo")).toBeLessThan(html.indexOf("Weedle"));
  });
});

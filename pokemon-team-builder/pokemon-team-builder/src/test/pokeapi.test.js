import {
  normalizePokemon,
  pickDescription,
  getPokemon,
  getPokemonNamesByType,
} from "../js/pokeapi.js";

const rawPikachu = {
  id: 25,
  name: "pikachu",
  height: 4,
  weight: 60,
  types: [{ type: { name: "electric" } }],
  sprites: {
    front_default: "front.png",
    other: { "official-artwork": { front_default: "art.png" } },
  },
  stats: [{ base_stat: 35, stat: { name: "hp" } }],
  abilities: [
    { is_hidden: false, ability: { name: "static" } },
    { is_hidden: true, ability: { name: "lightning-rod" } },
  ],
};

function mockFetch(...responses) {
  global.fetch = jest.fn();
  responses.forEach((response) => global.fetch.mockResolvedValueOnce(response));
}

const ok = (data) => ({ ok: true, json: async () => data });

describe("normalizePokemon", () => {
  test("flattens the API shape and converts units", () => {
    expect(normalizePokemon(rawPikachu)).toEqual({
      id: 25,
      name: "pikachu",
      types: ["electric"],
      image: "art.png",
      height: 0.4,
      weight: 6,
      stats: [{ name: "hp", value: 35 }],
      abilities: [
        { name: "static", hidden: false },
        { name: "lightning-rod", hidden: true },
      ],
    });
  });

  test("falls back to the small sprite, then to an empty string", () => {
    const noArt = { ...rawPikachu, sprites: { front_default: "front.png" } };
    expect(normalizePokemon(noArt).image).toBe("front.png");

    const noImages = { ...rawPikachu, sprites: {} };
    expect(normalizePokemon(noImages).image).toBe("");
  });
});

describe("pickDescription", () => {
  test("uses the first English entry and removes line breaks", () => {
    const species = {
      flavor_text_entries: [
        { language: { name: "ja" }, flavor_text: "..." },
        {
          language: { name: "en" },
          flavor_text: "Mouse\fPokémon.\nIt is shy.",
        },
      ],
    };
    expect(pickDescription(species)).toBe("Mouse Pokémon. It is shy.");
  });

  test("returns an empty string when there is no English entry", () => {
    expect(pickDescription({ flavor_text_entries: [] })).toBe("");
    expect(pickDescription({})).toBe("");
  });
});

describe("requests", () => {
  test("a failed request is not cached, so a retry can succeed", async () => {
    mockFetch({ ok: false, status: 500 }, ok(rawPikachu));

    await expect(getPokemon("pikachu")).rejects.toThrow("status 500");
    await expect(getPokemon("pikachu")).resolves.toMatchObject({ id: 25 });
    expect(global.fetch).toHaveBeenCalledTimes(2);
  });

  test("type lists drop alternate forms with ids above 1025", async () => {
    mockFetch(
      ok({
        pokemon: [
          { pokemon: { name: "charmander", url: "https://x/pokemon/4/" } },
          {
            pokemon: {
              name: "charizard-mega-x",
              url: "https://x/pokemon/10034/",
            },
          },
        ],
      }),
    );

    await expect(getPokemonNamesByType("fire")).resolves.toEqual([
      "charmander",
    ]);
  });
});

import { getPokemonTypeMap, POKEMON_TYPES } from "../js/pokeapi.js";

// a type answer listing Pokémon as [name, id, slot]
function typeAnswer(entries) {
  return {
    ok: true,
    json: async () => ({
      pokemon: entries.map(([name, id, slot]) => ({
        slot,
        pokemon: { name, url: `https://pokeapi.co/api/v2/pokemon/${id}/` },
      })),
    }),
  };
}

test("builds one name-to-types map from the 18 type lists", async () => {
  const lists = {
    grass: [
      ["bulbasaur", 1, 1],
      ["oddish", 43, 1],
    ],
    poison: [
      ["bulbasaur", 1, 2],
      ["oddish", 43, 2],
      ["koffing", 109, 1],
    ],
    fire: [
      ["charmander", 4, 1],
      ["charizard-mega-x", 10034, 1],
    ],
  };
  global.fetch = jest.fn(async (url) => {
    const type = url.split("/type/")[1];
    return typeAnswer(lists[type] || []);
  });

  const map = await getPokemonTypeMap();

  expect(global.fetch).toHaveBeenCalledTimes(POKEMON_TYPES.length);
  // types come out in slot order, whatever order the lists were read in
  expect(map.bulbasaur).toEqual(["grass", "poison"]);
  expect(map.koffing).toEqual(["poison"]);
  expect(map.charmander).toEqual(["fire"]);
  // alternate forms above id 1025 are dropped
  expect(map["charizard-mega-x"]).toBeUndefined();
});

test("asking again reuses the answer", async () => {
  global.fetch.mockClear();
  await getPokemonTypeMap();
  expect(global.fetch).not.toHaveBeenCalled();
});

import { findPokemonNames } from "../js/search.js";

const api = {
  getPokemonNames: async () => [
    "bulbasaur",
    "pikachu",
    "raichu",
    "mr-mime",
    "pichu",
  ],
  getPokemonNamesByType: async () => ["pikachu", "raichu", "pichu"],
};

test("an empty search returns every name", async () => {
  expect(await findPokemonNames({ term: "   " }, api)).toHaveLength(5);
});

test("matches part of a name, ignoring case", async () => {
  expect(await findPokemonNames({ term: "CHU" }, api)).toEqual([
    "pikachu",
    "raichu",
    "pichu",
  ]);
});

test("names that start with the term come first", async () => {
  expect(await findPokemonNames({ term: "pi" }, api)).toEqual([
    "pikachu",
    "pichu",
  ]);
  expect(await findPokemonNames({ term: "chu" }, api)).toEqual([
    "pikachu",
    "raichu",
    "pichu",
  ]);
});

test("a space in the term finds hyphenated names", async () => {
  expect(await findPokemonNames({ term: "mr mime" }, api)).toEqual(["mr-mime"]);
});

test("the type filter and the term work together", async () => {
  expect(await findPokemonNames({ term: "r", type: "electric" }, api)).toEqual([
    "raichu",
  ]);
  expect(await findPokemonNames({ type: "electric" }, api)).toHaveLength(3);
});

test("returns an empty list when nothing matches", async () => {
  expect(await findPokemonNames({ term: "zzz" }, api)).toEqual([]);
});

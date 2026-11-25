// All requests to PokeAPI live here, so the rest of the app never touches fetch.
const BASE_URL = "https://pokeapi.co/api/v2";

// ids above this are alternate forms (mega, gmax, ...) without good artwork
const MAX_POKEMON_ID = 1025;

export const POKEMON_TYPES = [
  "normal",
  "fire",
  "water",
  "electric",
  "grass",
  "ice",
  "fighting",
  "poison",
  "ground",
  "flying",
  "psychic",
  "bug",
  "rock",
  "ghost",
  "dragon",
  "dark",
  "steel",
  "fairy",
];

async function getJson(path) {
  const response = await fetch(`${BASE_URL}${path}`);
  if (!response.ok) {
    throw new Error(`PokeAPI request failed with status ${response.status}`);
  }
  return response.json();
}

// remember each answer so repeat searches and re-opened details are instant;
// a failed request is forgotten so the next try can succeed
const cache = new Map();

function cached(key, load) {
  if (!cache.has(key)) {
    cache.set(
      key,
      load().catch((err) => {
        cache.delete(key);
        throw err;
      }),
    );
  }
  return cache.get(key);
}

// "https://pokeapi.co/api/v2/pokemon/25/" -> 25
function idFromUrl(url) {
  return Number(url.split("/").filter(Boolean).pop());
}

// every Pokémon name, used for searching by part of a name
export function getPokemonNames() {
  return cached("names", async () => {
    const data = await getJson(`/pokemon?limit=${MAX_POKEMON_ID}`);
    return data.results.map((entry) => entry.name);
  });
}

// one type's raw answer, shared by the name list and the type map below
function getTypeData(type) {
  return cached(`typedata:${type}`, () =>
    getJson(`/type/${encodeURIComponent(type)}`),
  );
}

// the names of every Pokémon of one type
export function getPokemonNamesByType(type) {
  return cached(`type:${type}`, async () => {
    const data = await getTypeData(type);
    return data.pokemon
      .map((entry) => entry.pokemon)
      .filter((pokemon) => idFromUrl(pokemon.url) <= MAX_POKEMON_ID)
      .map((pokemon) => pokemon.name);
  });
}

// { pikachu: ["electric"], bulbasaur: ["grass", "poison"], ... }
// PokeAPI has no list of every Pokémon with its types, so this is built from
// the 18 type lists (18 requests, once). That is far fewer than one request
// per Pokémon, and it is enough to compare types.
export function getPokemonTypeMap() {
  return cached("type-map", async () => {
    const answers = await Promise.all(POKEMON_TYPES.map(getTypeData));
    const found = {};

    answers.forEach((data, index) => {
      data.pokemon.forEach((entry) => {
        if (idFromUrl(entry.pokemon.url) > MAX_POKEMON_ID) {
          return;
        }
        found[entry.pokemon.name] ??= [];
        found[entry.pokemon.name].push({
          type: POKEMON_TYPES[index],
          slot: entry.slot,
        });
      });
    });

    // slot 1 is the first type, slot 2 the second
    return Object.fromEntries(
      Object.entries(found).map(([name, list]) => [
        name,
        list
          .sort((first, second) => first.slot - second.slot)
          .map((item) => item.type),
      ]),
    );
  });
}

// keep only the fields the app uses, in a flat shape that is easy to render
export function normalizePokemon(raw) {
  return {
    id: raw.id,
    name: raw.name,
    types: raw.types.map((entry) => entry.type.name),
    image:
      raw.sprites?.other?.["official-artwork"]?.front_default ||
      raw.sprites?.front_default ||
      "",
    // the API sends decimetres and hectograms
    height: raw.height / 10,
    weight: raw.weight / 10,
    stats: raw.stats.map((entry) => ({
      name: entry.stat.name,
      value: entry.base_stat,
    })),
    abilities: raw.abilities.map((entry) => ({
      name: entry.ability.name,
      hidden: entry.is_hidden,
    })),
  };
}

export function getPokemon(name) {
  return cached(`pokemon:${name}`, async () =>
    normalizePokemon(await getJson(`/pokemon/${encodeURIComponent(name)}`)),
  );
}

// first English flavor text, with the game's line breaks turned into spaces
export function pickDescription(species) {
  const entry = species.flavor_text_entries?.find(
    (flavor) => flavor.language.name === "en",
  );
  return entry ? entry.flavor_text.replace(/[\f\n\r]+/g, " ").trim() : "";
}

export function getPokemonDescription(id) {
  return cached(`species:${id}`, async () =>
    pickDescription(await getJson(`/pokemon-species/${id}`)),
  );
}

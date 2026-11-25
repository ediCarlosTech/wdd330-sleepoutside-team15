// How many cards are drawn at a time
export const PAGE_SIZE = 12;

// find the names that match a search term and an optional type
// api is anything with getPokemonNames() and getPokemonNamesByType(type)
export async function findPokemonNames({ term = "", type = "" }, api) {
  // names use hyphens, so "mr mime" should find "mr-mime"
  const cleanTerm = term.trim().toLowerCase().replace(/\s+/g, "-");

  let names = await api.getPokemonNames();

  if (type) {
    const ofType = new Set(await api.getPokemonNamesByType(type));
    names = names.filter((name) => ofType.has(name));
  }

  if (!cleanTerm) {
    return names;
  }

  // names that start with the term come first, then names that contain it
  const startsWith = names.filter((name) => name.startsWith(cleanTerm));
  const contains = names.filter(
    (name) => !name.startsWith(cleanTerm) && name.includes(cleanTerm),
  );
  return [...startsWith, ...contains];
}

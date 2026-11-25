// How many cards are drawn at a time
export const PAGE_SIZE = 12;

// find the names that match a search term and an optional type
// api is anything with getPokemonNames() and getPokemonNamesByType(type)
export async function findPokemonNames({ term = "", type = "" }, api) {
  // names use hyphens, so "mr mime" should find "mr-mime"
  const cleanTerm = term.trim().toLowerCase().replace(/\s+/g, "-");

  const allNames = await api.getPokemonNames();
  let names = allNames;

  if (type) {
    const ofType = new Set(await api.getPokemonNamesByType(type));
    names = names.filter((name) => ofType.has(name));
  }

  if (!cleanTerm) {
    return names;
  }

  // a number is a Pokédex number, and the name list is in that order
  if (/^\d+$/.test(cleanTerm)) {
    const nameById = allNames[Number(cleanTerm) - 1];
    return nameById && names.includes(nameById) ? [nameById] : [];
  }

  // names that start with the term come first, then names that contain it
  const startsWith = names.filter((name) => name.startsWith(cleanTerm));
  const contains = names.filter(
    (name) => !name.startsWith(cleanTerm) && name.includes(cleanTerm),
  );
  return [...startsWith, ...contains];
}

// Helpers for the Pokémon a person owns. Nothing here touches the page or the
// network, so it is easy to test and safe to share between modules.

const MAX_IV_TOTAL = 45; // three IVs, each 0 to 15

function hasValue(value) {
  return Number.isInteger(value);
}

function ivValues(entry) {
  return [entry.ivAttack, entry.ivDefense, entry.ivStamina];
}

// the IV total as a whole percent, or null if any IV is missing
export function ivPercent(entry) {
  const values = ivValues(entry);
  if (!values.every(hasValue)) {
    return null;
  }
  const total = values.reduce((sum, value) => sum + value, 0);
  return Math.round((total / MAX_IV_TOTAL) * 100);
}

// "15/14/13", with "?" for any IV that was not entered. "" if none were.
export function ivText(entry) {
  const values = ivValues(entry);
  if (!values.some(hasValue)) {
    return "";
  }
  return values.map((value) => (hasValue(value) ? value : "?")).join("/");
}

// 0 to 1, how strong the IVs are. Unknown IVs count as average (0.5), so an
// entry with no IVs is neither rewarded nor punished.
export function ivShare(entry) {
  const percent = ivPercent(entry);
  return percent === null ? 0.5 : percent / 100;
}

// "CP 1500, IVs 15/14/13 (96%)" using only what was entered
export function describeOwned(entry) {
  const parts = [];
  if (hasValue(entry.cp)) {
    parts.push(`CP ${entry.cp}`);
  }
  const ivs = ivText(entry);
  if (ivs) {
    const percent = ivPercent(entry);
    parts.push(`IVs ${ivs}${percent === null ? "" : ` (${percent}%)`}`);
  }
  return parts.length > 0 ? parts.join(", ") : "no stats entered yet";
}

// negative when `first` is the better one to count on: stronger IVs, then CP
function compareStrength(first, second) {
  const byIvs = ivShare(second) - ivShare(first);
  if (byIvs !== 0) {
    return byIvs;
  }
  return (second.cp ?? 0) - (first.cp ?? 0);
}

// species -> the best one the person owns of it (a person can own many)
export function bestBySpecies(list) {
  const best = new Map();
  list.forEach((entry) => {
    const current = best.get(entry.species);
    if (!current || compareStrength(entry, current) < 0) {
      best.set(entry.species, entry);
    }
  });
  return best;
}

// highest CP first, entries without a CP last, then by name
export function sortByCp(list) {
  return [...list].sort(
    (first, second) =>
      (second.cp ?? -1) - (first.cp ?? -1) ||
      first.species.localeCompare(second.species),
  );
}

// "Mr Mime", "mr-mime" and " MR MIME " all mean the same Pokémon
export function normalizeSpecies(text) {
  return String(text).trim().toLowerCase().replace(/\s+/g, "-");
}

function numberOrNull(text) {
  const trimmed = String(text ?? "").trim();
  return trimmed === "" ? null : Number(trimmed);
}

// Turns the form's text fields into the body the server expects.
// fields: an object of strings (and booleans for the three flags)
export function bodyFromFields(fields) {
  return {
    species: normalizeSpecies(fields.species),
    nickname: String(fields.nickname ?? "").trim(),
    cp: numberOrNull(fields.cp),
    level: numberOrNull(fields.level),
    ivAttack: numberOrNull(fields.ivAttack),
    ivDefense: numberOrNull(fields.ivDefense),
    ivStamina: numberOrNull(fields.ivStamina),
    fastMove: String(fields.fastMove ?? "").trim(),
    chargedMove1: String(fields.chargedMove1 ?? "").trim(),
    chargedMove2: String(fields.chargedMove2 ?? "").trim(),
    shiny: Boolean(fields.shiny),
    shadow: Boolean(fields.shadow),
    lucky: Boolean(fields.lucky),
    notes: String(fields.notes ?? "").trim(),
  };
}

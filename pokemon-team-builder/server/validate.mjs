// Everything the browser sends is checked here, because the browser can lie.
// Each function returns { value } on success or { error } with a message
// that is safe to show to the person.

export const MAX_OWNED_PER_USER = 1000;

const USERNAME = /^[A-Za-z0-9_]{3,30}$/;

export function validateCredentials(body, { creating }) {
  const { username: rawUsername, password } = body ?? {};

  if (typeof rawUsername !== "string" || typeof password !== "string") {
    return { error: "Enter a username and a password." };
  }
  // stray spaces from pasting should not matter
  const username = rawUsername.trim();
  if (creating) {
    if (!USERNAME.test(username)) {
      return {
        error: "Usernames are 3 to 30 letters, numbers, or underscores.",
      };
    }
    if (password.length < 8) {
      return { error: "Passwords need at least 8 characters." };
    }
  }
  // scrypt is slow on purpose, so a huge password would be a cheap way to hog the server
  if (password.length > 128) {
    return { error: "Passwords can be at most 128 characters." };
  }
  return { value: { username, password } };
}

// A valid username built from a name or email start, such as "José" -> "Jose".
// suffix is added to make it unique, like "_4821".
export function suggestUsername(hint, suffix = "") {
  const base = String(hint ?? "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Za-z0-9_]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 22);
  return `${base.length >= 3 ? base : "trainer"}${suffix}`;
}

function optionalText(value, label, maxLength) {
  if (value === undefined || value === null || value === "") {
    return { value: null };
  }
  if (typeof value !== "string") {
    return { error: `${label} must be text.` };
  }
  const text = value.trim();
  if (text.length > maxLength) {
    return { error: `${label} can be at most ${maxLength} characters.` };
  }
  return { value: text || null };
}

function optionalInteger(value, label, min, max) {
  if (value === undefined || value === null || value === "") {
    return { value: null };
  }
  if (!Number.isInteger(value) || value < min || value > max) {
    return { error: `${label} must be a whole number from ${min} to ${max}.` };
  }
  return { value };
}

function flag(value, label) {
  if (value === undefined || value === null) {
    return { value: 0 };
  }
  if (typeof value !== "boolean") {
    return { error: `${label} must be true or false.` };
  }
  return { value: value ? 1 : 0 };
}

// Pokémon GO levels run 1 to 50 in half steps (51 with a best buddy boost)
function optionalLevel(value) {
  if (value === undefined || value === null || value === "") {
    return { value: null };
  }
  if (
    typeof value !== "number" ||
    value < 1 ||
    value > 51 ||
    (value * 2) % 1 !== 0
  ) {
    return { error: "Level must be from 1 to 51, in steps of 0.5." };
  }
  return { value };
}

// A species is a Pokédex name slug like "mr-mime". The server does not look it
// up, but it only accepts that shape.
const SPECIES = /^[a-z0-9]+(-[a-z0-9]+)*$/;

// turns a request body into database fields, ignoring anything unexpected
export function validateOwned(body) {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return { error: "Send the Pokémon's details as JSON." };
  }

  if (
    typeof body.species !== "string" ||
    !SPECIES.test(body.species) ||
    body.species.length > 40
  ) {
    return { error: "Choose a Pokémon." };
  }

  const checks = {
    nickname: optionalText(body.nickname, "Nickname", 20),
    cp: optionalInteger(body.cp, "CP", 10, 10000),
    level: optionalLevel(body.level),
    ivAttack: optionalInteger(body.ivAttack, "Attack IV", 0, 15),
    ivDefense: optionalInteger(body.ivDefense, "Defense IV", 0, 15),
    ivStamina: optionalInteger(body.ivStamina, "Stamina IV", 0, 15),
    fastMove: optionalText(body.fastMove, "Fast move", 40),
    chargedMove1: optionalText(body.chargedMove1, "Charged move 1", 40),
    chargedMove2: optionalText(body.chargedMove2, "Charged move 2", 40),
    shiny: flag(body.shiny, "Shiny"),
    shadow: flag(body.shadow, "Shadow"),
    lucky: flag(body.lucky, "Lucky"),
    notes: optionalText(body.notes, "Notes", 500),
  };

  for (const result of Object.values(checks)) {
    if (result.error) {
      return { error: result.error };
    }
  }

  const value = { species: body.species };
  for (const [key, result] of Object.entries(checks)) {
    value[key] = result.value;
  }
  return { value };
}

// a database row in the shape the browser uses
export function ownedFromRow(row) {
  return {
    id: row.id,
    species: row.species,
    nickname: row.nickname,
    cp: row.cp,
    level: row.level,
    ivAttack: row.iv_attack,
    ivDefense: row.iv_defense,
    ivStamina: row.iv_stamina,
    fastMove: row.fast_move,
    chargedMove1: row.charged_move_1,
    chargedMove2: row.charged_move_2,
    shiny: Boolean(row.shiny),
    shadow: Boolean(row.shadow),
    lucky: Boolean(row.lucky),
    notes: row.notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

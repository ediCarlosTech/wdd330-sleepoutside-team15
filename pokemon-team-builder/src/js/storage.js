// Everything saved in the browser lives here. Stored data is untrusted:
// it can be missing, edited by hand, or from an older version of the app.
import { MAX_TEAM_SIZE, clampTeamSize } from "./teamBuilder.js";

const KEYS = {
  team: "ptb-team",
  teamSize: "ptb-team-size",
  saved: "ptb-saved-teams",
  favorites: "ptb-favorites",
  recent: "ptb-recent",
};

export const MAX_RECENT = 8;

function read(key) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch (err) {
    // storage turned off, or the text is not valid JSON
    return null;
  }
}

// returns false when the browser refuses (private mode, storage full)
function write(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (err) {
    return false;
  }
}

function readNames(key) {
  const value = read(key);
  return Array.isArray(value)
    ? value.filter((item) => typeof item === "string")
    : [];
}

export const getTeamNames = () => readNames(KEYS.team);
export const setTeamNames = (names) => write(KEYS.team, names);

export const getTeamSize = () =>
  clampTeamSize(read(KEYS.teamSize) ?? MAX_TEAM_SIZE);
export const setTeamSize = (size) => write(KEYS.teamSize, size);

export const getFavorites = () => readNames(KEYS.favorites);
export const setFavorites = (names) => write(KEYS.favorites, names);

export const getRecent = () => readNames(KEYS.recent);

// newest first, no repeats, only the last few
export function addRecent(name) {
  const names = [name, ...getRecent().filter((item) => item !== name)];
  return write(KEYS.recent, names.slice(0, MAX_RECENT));
}

export function getSavedTeams() {
  const value = read(KEYS.saved);
  if (!Array.isArray(value)) {
    return [];
  }
  return value
    .filter(
      (team) =>
        team &&
        typeof team.id === "string" &&
        typeof team.name === "string" &&
        Array.isArray(team.members),
    )
    .map((team) => ({
      ...team,
      members: team.members.filter((item) => typeof item === "string"),
      // teams saved before sizes existed were all for six
      size: clampTeamSize(team.size ?? MAX_TEAM_SIZE),
    }));
}

// saving under a name that already exists replaces that team
// returns the saved team, or null if the browser refused to store it
export function saveTeam(name, members, size = MAX_TEAM_SIZE) {
  const team = {
    id: `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
    name,
    members: [...members],
    size: clampTeamSize(size),
    savedAt: new Date().toISOString(),
  };
  const others = getSavedTeams().filter(
    (saved) => saved.name.toLowerCase() !== name.toLowerCase(),
  );
  return write(KEYS.saved, [team, ...others]) ? team : null;
}

export function deleteSavedTeam(id) {
  return write(
    KEYS.saved,
    getSavedTeams().filter((team) => team.id !== id),
  );
}

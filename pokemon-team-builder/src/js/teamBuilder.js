import { formatName } from "./renderer.js";

// The biggest team the app allows. Main-series teams have 6; Pokémon GO
// Battle League teams have 3, so the size can be lowered (never below 1).
export const MAX_TEAM_SIZE = 6;
export const MIN_TEAM_SIZE = 1;

// any value becomes a whole number from 1 to 6, and junk becomes 6
export function clampTeamSize(value) {
  const size = Math.round(Number(value));
  if (!Number.isFinite(size)) {
    return MAX_TEAM_SIZE;
  }
  return Math.min(MAX_TEAM_SIZE, Math.max(MIN_TEAM_SIZE, size));
}

function uniqueNames(names, limit) {
  return [...new Set(names)].slice(0, limit);
}

// The current team: different Pokémon, up to the chosen size, kept in storage.
// storage is anything with getTeamNames(), setTeamNames(names),
// getTeamSize(), and setTeamSize(size)
export default class Team {
  constructor(storage) {
    this.storage = storage;
    // stored data may be damaged, so clean it before trusting it
    this.maxSize = clampTeamSize(storage.getTeamSize());
    this.members = uniqueNames(storage.getTeamNames(), this.maxSize);
    this.listeners = [];
  }

  // the callback gets (members, change) where change is
  // "add", "remove", "load", "clear", or "size"
  onChange(listener) {
    this.listeners.push(listener);
  }

  has(name) {
    return this.members.includes(name);
  }

  get isFull() {
    return this.members.length >= this.maxSize;
  }

  add(name) {
    if (this.has(name)) {
      return {
        ok: false,
        reason: "duplicate",
        message: `${formatName(name)} is already on your team.`,
      };
    }
    if (this.isFull) {
      return {
        ok: false,
        reason: "full",
        message: `Your team already has ${this.maxSize} Pokémon. Remove one to add ${formatName(name)}.`,
      };
    }
    this.members.push(name);
    this.commit("add");
    return { ok: true };
  }

  remove(name) {
    if (this.has(name)) {
      this.members = this.members.filter((member) => member !== name);
      this.commit("remove");
    }
  }

  // who would be dropped if the team were made this size
  membersBeyond(size) {
    return this.members.slice(clampTeamSize(size));
  }

  // a smaller team drops the Pokémon from the end, so ask first (see membersBeyond)
  setSize(size) {
    this.maxSize = clampTeamSize(size);
    this.members = this.members.slice(0, this.maxSize);
    this.commit("size");
  }

  // swap in a whole team, for example a saved one, and its size
  replace(names, size = this.maxSize) {
    this.maxSize = clampTeamSize(size);
    this.members = uniqueNames(names, this.maxSize);
    this.commit("load");
  }

  clear() {
    this.members = [];
    this.commit("clear");
  }

  commit(change) {
    this.storage.setTeamSize(this.maxSize);
    this.storage.setTeamNames(this.members);
    this.listeners.forEach((listener) => listener(this.members, change));
  }
}

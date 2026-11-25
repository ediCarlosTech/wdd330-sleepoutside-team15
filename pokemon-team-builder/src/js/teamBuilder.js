import { formatName } from "./renderer.js";

export const MAX_TEAM_SIZE = 6;

function uniqueNames(names) {
  return [...new Set(names)].slice(0, MAX_TEAM_SIZE);
}

// The current team: up to six different Pokémon, kept in storage.
// storage is anything with getTeamNames() and setTeamNames(names)
export default class Team {
  constructor(storage) {
    this.storage = storage;
    // stored data may be damaged, so clean it before trusting it
    this.members = uniqueNames(storage.getTeamNames());
    this.listeners = [];
  }

  // the callback gets (members, change) where change is "add", "remove", "load", or "clear"
  onChange(listener) {
    this.listeners.push(listener);
  }

  has(name) {
    return this.members.includes(name);
  }

  get isFull() {
    return this.members.length >= MAX_TEAM_SIZE;
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
        message: `Your team already has ${MAX_TEAM_SIZE} Pokémon. Remove one to add ${formatName(name)}.`,
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

  // swap in a whole team, for example a saved one
  replace(names) {
    this.members = uniqueNames(names);
    this.commit("load");
  }

  clear() {
    this.members = [];
    this.commit("clear");
  }

  commit(change) {
    this.storage.setTeamNames(this.members);
    this.listeners.forEach((listener) => listener(this.members, change));
  }
}

import Team, { MAX_TEAM_SIZE } from "../js/teamBuilder.js";

function makeStorage(names = []) {
  return { getTeamNames: () => names, setTeamNames: jest.fn() };
}

test("a damaged stored team is cleaned: no repeats, at most six", () => {
  const team = new Team(
    makeStorage(["a", "a", "b", "c", "d", "e", "f", "g", "h"]),
  );
  expect(team.members).toEqual(["a", "b", "c", "d", "e", "f"]);
});

test("add puts the Pokémon on the team and saves it", () => {
  const storage = makeStorage();
  const team = new Team(storage);

  expect(team.add("pikachu")).toEqual({ ok: true });
  expect(team.members).toEqual(["pikachu"]);
  expect(storage.setTeamNames).toHaveBeenCalledWith(["pikachu"]);
});

test("the same Pokémon cannot join twice", () => {
  const team = new Team(makeStorage(["pikachu"]));
  const result = team.add("pikachu");

  expect(result).toMatchObject({ ok: false, reason: "duplicate" });
  expect(result.message).toBe("Pikachu is already on your team.");
  expect(team.members).toHaveLength(1);
});

test("a seventh Pokémon is refused with a message", () => {
  const team = new Team(makeStorage(["a", "b", "c", "d", "e", "f"]));
  const result = team.add("mr-mime");

  expect(team.isFull).toBe(true);
  expect(result).toMatchObject({ ok: false, reason: "full" });
  expect(result.message).toContain(`${MAX_TEAM_SIZE} Pokémon`);
  expect(result.message).toContain("Mr Mime");
  expect(team.members).toHaveLength(6);
});

test("remove frees a slot, and removing a stranger does nothing", () => {
  const storage = makeStorage(["a", "b"]);
  const team = new Team(storage);

  team.remove("zzz");
  expect(storage.setTeamNames).not.toHaveBeenCalled();

  team.remove("a");
  expect(team.members).toEqual(["b"]);
  expect(storage.setTeamNames).toHaveBeenCalledWith(["b"]);
});

test("replace swaps the whole team and keeps the six-member limit", () => {
  const team = new Team(makeStorage(["a"]));
  team.replace(["x", "y", "x", "z", "1", "2", "3", "4"]);
  expect(team.members).toEqual(["x", "y", "z", "1", "2", "3"]);
});

test("listeners hear what kind of change happened", () => {
  const team = new Team(makeStorage());
  const seen = [];
  team.onChange((members, change) => seen.push(change));

  team.add("a");
  team.add("a"); // refused, so no event
  team.remove("a");
  team.replace(["b"]);
  team.clear();

  expect(seen).toEqual(["add", "remove", "load", "clear"]);
  expect(team.members).toEqual([]);
});

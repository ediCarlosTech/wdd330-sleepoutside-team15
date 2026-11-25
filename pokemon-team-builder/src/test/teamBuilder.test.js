import Team, { MAX_TEAM_SIZE, clampTeamSize } from "../js/teamBuilder.js";

function makeStorage(names = [], size = 6) {
  return {
    getTeamNames: () => names,
    setTeamNames: jest.fn(),
    getTeamSize: () => size,
    setTeamSize: jest.fn(),
  };
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

describe("team size", () => {
  test("clampTeamSize keeps sizes between 1 and 6 and fixes junk", () => {
    expect(clampTeamSize(3)).toBe(3);
    expect(clampTeamSize("4")).toBe(4);
    expect(clampTeamSize(0)).toBe(1);
    expect(clampTeamSize(99)).toBe(6);
    expect(clampTeamSize(2.6)).toBe(3);
    expect(clampTeamSize(undefined)).toBe(6);
    expect(clampTeamSize("abc")).toBe(6);
  });

  test("a team of three refuses a fourth Pokémon and says why", () => {
    const team = new Team(makeStorage(["a", "b", "c"], 3));
    const result = team.add("d");

    expect(team.isFull).toBe(true);
    expect(result).toMatchObject({ ok: false, reason: "full" });
    expect(result.message).toContain("already has 3 Pokémon");
  });

  test("a stored team larger than its size is trimmed on load", () => {
    const team = new Team(makeStorage(["a", "b", "c", "d"], 2));
    expect(team.members).toEqual(["a", "b"]);
  });

  test("a damaged stored size becomes six", () => {
    const team = new Team(makeStorage([], "banana"));
    expect(team.maxSize).toBe(6);
  });

  test("membersBeyond shows who a smaller team would drop, without dropping them", () => {
    const team = new Team(makeStorage(["a", "b", "c", "d"]));
    expect(team.membersBeyond(2)).toEqual(["c", "d"]);
    expect(team.membersBeyond(6)).toEqual([]);
    expect(team.members).toHaveLength(4);
  });

  test("setSize trims from the end, saves both values, and tells listeners", () => {
    const storage = makeStorage(["a", "b", "c", "d"]);
    const team = new Team(storage);
    const seen = [];
    team.onChange((members, change) => seen.push(change));

    team.setSize(2);

    expect(team.members).toEqual(["a", "b"]);
    expect(storage.setTeamSize).toHaveBeenCalledWith(2);
    expect(storage.setTeamNames).toHaveBeenCalledWith(["a", "b"]);
    expect(seen).toEqual(["size"]);
  });

  test("growing the team keeps everyone and opens slots", () => {
    const team = new Team(makeStorage(["a", "b", "c"], 3));
    team.setSize(5);
    expect(team.members).toHaveLength(3);
    expect(team.isFull).toBe(false);
    expect(team.add("d")).toEqual({ ok: true });
  });

  test("replace can set the size too, as when loading a saved team", () => {
    const team = new Team(makeStorage([], 6));
    team.replace(["x", "y", "z", "w"], 3);
    expect(team.maxSize).toBe(3);
    expect(team.members).toEqual(["x", "y", "z"]);
  });
});

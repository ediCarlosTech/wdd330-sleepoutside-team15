/**
 * @jest-environment jsdom
 */
import {
  getTeamNames,
  setTeamNames,
  getFavorites,
  setFavorites,
  addRecent,
  getRecent,
  MAX_RECENT,
  saveTeam,
  getSavedTeams,
  deleteSavedTeam,
} from "../js/storage.js";

beforeEach(() => {
  localStorage.clear();
  jest.restoreAllMocks();
});

test("missing data reads as an empty list", () => {
  expect(getTeamNames()).toEqual([]);
  expect(getSavedTeams()).toEqual([]);
});

test("names round-trip through storage", () => {
  setTeamNames(["pikachu", "eevee"]);
  setFavorites(["mew"]);
  expect(getTeamNames()).toEqual(["pikachu", "eevee"]);
  expect(getFavorites()).toEqual(["mew"]);
});

test("broken JSON and wrong shapes are ignored", () => {
  localStorage.setItem("ptb-team", "{not json");
  localStorage.setItem("ptb-favorites", JSON.stringify({ a: 1 }));
  localStorage.setItem("ptb-recent", JSON.stringify(["ok", 7, null, "fine"]));

  expect(getTeamNames()).toEqual([]);
  expect(getFavorites()).toEqual([]);
  expect(getRecent()).toEqual(["ok", "fine"]);
});

test("recent keeps newest first, without repeats, up to the limit", () => {
  ["a", "b", "c"].forEach(addRecent);
  addRecent("a");
  expect(getRecent()).toEqual(["a", "c", "b"]);

  for (let index = 0; index < MAX_RECENT + 3; index += 1) {
    addRecent(`p${index}`);
  }
  expect(getRecent()).toHaveLength(MAX_RECENT);
  expect(getRecent()[0]).toBe(`p${MAX_RECENT + 2}`);
});

test("saved teams are listed newest first and can be deleted", () => {
  const first = saveTeam("Rain", ["squirtle"]);
  const second = saveTeam("Sun", ["charmander", "vulpix"]);

  expect(getSavedTeams().map((team) => team.name)).toEqual(["Sun", "Rain"]);
  expect(second.members).toEqual(["charmander", "vulpix"]);

  deleteSavedTeam(first.id);
  expect(getSavedTeams().map((team) => team.name)).toEqual(["Sun"]);
});

test("saving with an existing name replaces that team, ignoring case", () => {
  saveTeam("Rain", ["squirtle"]);
  saveTeam("rain", ["psyduck"]);

  const teams = getSavedTeams();
  expect(teams).toHaveLength(1);
  expect(teams[0].members).toEqual(["psyduck"]);
});

test("damaged saved teams are dropped or cleaned", () => {
  localStorage.setItem(
    "ptb-saved-teams",
    JSON.stringify([
      { id: "1", name: "Good", members: ["a", 5, "b"] },
      { id: 2, name: "Bad id", members: [] },
      null,
      { id: "3", name: "No members" },
    ]),
  );
  expect(getSavedTeams()).toEqual([
    { id: "1", name: "Good", members: ["a", "b"] },
  ]);
});

test("a browser that refuses to store gives a clear failure, not a crash", () => {
  jest.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
    throw new Error("QuotaExceededError");
  });

  expect(setTeamNames(["a"])).toBe(false);
  expect(saveTeam("Full", ["a"])).toBeNull();
});

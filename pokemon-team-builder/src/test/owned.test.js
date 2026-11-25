import {
  ivPercent,
  ivText,
  ivShare,
  describeOwned,
  bestBySpecies,
  sortByCp,
  normalizeSpecies,
  bodyFromFields,
} from "../js/owned.js";

const perfect = {
  species: "pikachu",
  cp: 900,
  ivAttack: 15,
  ivDefense: 15,
  ivStamina: 15,
};
const noIvs = { species: "pikachu", cp: 1500 };

describe("IV helpers", () => {
  test("percent is the IV total out of 45, rounded", () => {
    expect(ivPercent(perfect)).toBe(100);
    expect(ivPercent({ ivAttack: 15, ivDefense: 14, ivStamina: 13 })).toBe(93);
    expect(ivPercent({ ivAttack: 0, ivDefense: 0, ivStamina: 0 })).toBe(0);
  });

  test("percent is unknown when any IV is missing", () => {
    expect(ivPercent(noIvs)).toBeNull();
    expect(
      ivPercent({ ivAttack: 15, ivDefense: null, ivStamina: 15 }),
    ).toBeNull();
  });

  test("text shows ? for missing IVs and nothing when all are missing", () => {
    expect(ivText({ ivAttack: 15, ivDefense: 14, ivStamina: 13 })).toBe(
      "15/14/13",
    );
    expect(ivText({ ivAttack: 15, ivDefense: null, ivStamina: 0 })).toBe(
      "15/?/0",
    );
    expect(ivText(noIvs)).toBe("");
  });

  test("unknown IVs count as average for scoring", () => {
    expect(ivShare(noIvs)).toBe(0.5);
    expect(ivShare(perfect)).toBe(1);
  });
});

describe("describeOwned", () => {
  test("uses only what was entered", () => {
    expect(
      describeOwned({ cp: 1500, ivAttack: 15, ivDefense: 14, ivStamina: 13 }),
    ).toBe("CP 1500, IVs 15/14/13 (93%)");
    expect(describeOwned({ cp: 1500 })).toBe("CP 1500");
    expect(
      describeOwned({ ivAttack: 1, ivDefense: null, ivStamina: null }),
    ).toBe("IVs 1/?/?");
    expect(describeOwned({})).toBe("no stats entered yet");
  });
});

describe("bestBySpecies", () => {
  test("keeps the one with the stronger IVs, then the higher CP", () => {
    const weakButHigh = {
      id: 1,
      species: "eevee",
      cp: 2000,
      ivAttack: 1,
      ivDefense: 1,
      ivStamina: 1,
    };
    const strong = {
      id: 2,
      species: "eevee",
      cp: 500,
      ivAttack: 15,
      ivDefense: 15,
      ivStamina: 15,
    };
    const tiedLow = { id: 3, species: "mew", cp: 100 };
    const tiedHigh = { id: 4, species: "mew", cp: 900 };

    const best = bestBySpecies([weakButHigh, strong, tiedLow, tiedHigh]);
    expect(best.get("eevee").id).toBe(2);
    expect(best.get("mew").id).toBe(4);
    expect(best.size).toBe(2);
  });

  test("an empty list gives an empty map", () => {
    expect(bestBySpecies([]).size).toBe(0);
  });
});

describe("sortByCp", () => {
  test("highest CP first, missing CP last, without changing the original", () => {
    const list = [
      { species: "b", cp: 100 },
      { species: "a" },
      { species: "c", cp: 900 },
    ];
    expect(sortByCp(list).map((entry) => entry.species)).toEqual([
      "c",
      "b",
      "a",
    ]);
    expect(list[0].species).toBe("b");
  });
});

describe("forms", () => {
  test("names are matched without caring about case or spaces", () => {
    expect(normalizeSpecies(" Mr Mime ")).toBe("mr-mime");
    expect(normalizeSpecies("mr-mime")).toBe("mr-mime");
    expect(normalizeSpecies("HO-OH")).toBe("ho-oh");
  });

  test("form text becomes numbers, nulls and booleans for the server", () => {
    const body = bodyFromFields({
      species: "Pikachu",
      nickname: "  Sparky ",
      cp: "1500",
      level: "30.5",
      ivAttack: "15",
      ivDefense: "",
      ivStamina: "0",
      fastMove: "Thunder Shock",
      chargedMove1: "",
      shiny: true,
      notes: "  hi ",
    });
    expect(body).toMatchObject({
      species: "pikachu",
      nickname: "Sparky",
      cp: 1500,
      level: 30.5,
      ivAttack: 15,
      ivDefense: null,
      ivStamina: 0,
      chargedMove1: "",
      shiny: true,
      shadow: false,
      lucky: false,
      notes: "hi",
    });
  });
});

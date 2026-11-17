import { searchProducts } from "../js/searchProducts.mjs";

const fakeSource = (byCategory) => ({
  getData: async (category) => {
    if (byCategory[category] instanceof Error) throw byCategory[category];
    return byCategory[category] || [];
  },
});

test("finds matches across categories, ignoring case", async () => {
  const source = fakeSource({
    tents: [{ Id: "1", Name: "Marmot Ajax Tent" }],
    backpacks: [{ Id: "2", Name: "Gregory Zulu Backpack" }],
  });
  const { matches } = await searchProducts("MARMOT", source);
  expect(matches.map((p) => p.Id)).toEqual(["1"]);
});

test("returns nothing for an empty term", async () => {
  const { matches } = await searchProducts("   ", fakeSource({}));
  expect(matches).toEqual([]);
});

test("removes duplicate products by Id", async () => {
  const product = { Id: "1", Name: "Kelty Pack" };
  const source = fakeSource({ tents: [product], backpacks: [product] });
  const { matches } = await searchProducts("kelty", source);
  expect(matches).toHaveLength(1);
});

test("reports partial failures and throws when all fail", async () => {
  const partial = fakeSource({
    tents: new Error("x"),
    backpacks: [{ Id: "2", Name: "Pack" }],
  });
  expect((await searchProducts("pack", partial)).failedCount).toBe(1);

  const failing = {
    getData: async () => {
      throw new Error("down");
    },
  };
  await expect(searchProducts("pack", failing)).rejects.toThrow();
});
// the categories the API serves; the same list the home page links to
export const SEARCH_CATEGORIES = [
  "tents",
  "backpacks",
  "sleeping-bags",
  "hammocks",
];

// search every category for products whose name contains the term
// dataSource is a ProductData instance (anything with getData(category))
// returns { matches, failedCount } so the page can warn about partial results
export async function searchProducts(term, dataSource) {
  const cleanTerm = (term || "").trim().toLowerCase();
  if (!cleanTerm) {
    return { matches: [], failedCount: 0 };
  }

  // allSettled: one failed category should not hide results from the others
  const settled = await Promise.allSettled(
    SEARCH_CATEGORIES.map((category) => dataSource.getData(category)),
  );

  const failedCount = settled.filter((r) => r.status === "rejected").length;
  if (failedCount === SEARCH_CATEGORIES.length) {
    throw new Error("All category requests failed");
  }

  // a product can appear in more than one category, so keep the first by Id
  const seen = new Set();
  const matches = settled
    .filter((r) => r.status === "fulfilled")
    .flatMap((r) => r.value)
    .filter((product) => {
      if (seen.has(product.Id)) return false;
      seen.add(product.Id);
      return (product.Name || "").toLowerCase().includes(cleanTerm);
    });

  return { matches, failedCount };
}
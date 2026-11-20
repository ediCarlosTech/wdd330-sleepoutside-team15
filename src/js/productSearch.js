import { loadheaderfooter, getParam } from "./utils.mjs";
import ProductData from "./ProductData.mjs";
import ProductList from "./ProductList.mjs";
import { searchProducts } from "./searchProducts.mjs";

loadheaderfooter();

const listElement = document.querySelector(".product-list");
const keywordElement = document.querySelector("#keyword");
// getParam returns null when the URL has no search term
const searchTerm = (getParam("search-product") || "").trim();

async function showResults() {
  keywordElement.textContent = searchTerm;

  if (!searchTerm) {
    listElement.innerHTML = "<li>Type a product name to search.</li>";
    return;
  }

  try {
    const { matches, failedCount } = await searchProducts(
      searchTerm,
      new ProductData(),
    );

    if (matches.length === 0) {
      keywordElement.textContent = `${searchTerm} (Item not found)`;
      return;
    }

    // criteria = true tells ProductList the "data source" is already an array
    new ProductList("search", matches, listElement, true).init();

    if (failedCount > 0) {
      listElement.insertAdjacentHTML(
        "beforebegin",
        "<p>Some categories could not be searched, so results may be incomplete.</p>",
      );
    }
  } catch (err) {
    listElement.innerHTML =
      "<li>Sorry, search is unavailable right now. Please try again.</li>";
  }
}

showResults();

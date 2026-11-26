import { loadheaderfooter, getParam, breadcrumb } from "./utils.mjs";
import ExternalServices from "./ExternalServices.mjs";
import ProductList from "./ProductList.mjs";
import QuickView from "./QuickView.mjs";

// Header and footer loader (updates the cart count on the backpack icon)
loadheaderfooter();

// get the category from the URL, form  "?category=<category>"
// if no category is provided default to tents
const category = getParam("category") || "tents";

// turn the category into a title, using wordslice and toUpper
const categoryName = category
  .split("-")
  .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
  .join(" ");

// add the category to the heading and the browser tab title
document.querySelector(".products h2").textContent =
  `Top Products: ${categoryName}`;
document.title = `Sleep Outside | ${categoryName}`;

// the data source that gets the products from the API
const dataSource = new ExternalServices();

// the list on the page where the product cards will go
const listElement = document.querySelector(".product-list");

// create the product list for the category and load the products
const productList = new ProductList(category, dataSource, listElement);
productList.init();

// the quick view pop-up: all of its logic is in "js/QuickView.mjs"
const quickView = new QuickView(
  document.querySelector("#quick-view-modal"),
  dataSource,
);
quickView.init();

// one listener on the list handles every "Quick View" button, because the
// cards are rebuilt every time the products are sorted
listElement.addEventListener("click", (event) => {
  const quickViewButton = event.target.closest(".quick-view");

  if (!quickViewButton) {
    return;
  }

  quickView.open(quickViewButton.dataset.id, quickViewButton);
});

// detect changes in the product sorting menu
const sortMenu = document.querySelector("#sort-products");

sortMenu.addEventListener("change", (event) => {
  productList.sortProducts(event.target.value);
});

// const itemCount = document.querySelectorAll(".product-card").length;

// add the breadcrumb below the header
productList.init().then(() => {
  const itemCount = listElement.querySelectorAll(".product-card").length;
  breadcrumb(itemCount);
});
import { loadheaderfooter, getParam } from "./utils.mjs";
import ExternalServices from "./ExternalServices.mjs";
import ProductList from "./ProductList.mjs";

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

// code for the modal
const modal = document.querySelector("#quick-view-modal");
const closeModalButton = document.querySelector("#close-modal");

const quickViewImage = document.querySelector("#quick-view-image");
const quickViewBrand = document.querySelector("#quick-view-brand");
const quickViewName = document.querySelector("#quick-view-name");
const quickViewPrice = document.querySelector("#quick-view-price");
const quickViewColor = document.querySelector("#quick-view-color");
const quickViewDescription = document.querySelector("#quick-view-description");

// create the product list for the category and load the products
const productList = new ProductList(category, dataSource, listElement);
productList.init();

// function to handle the modal
async function openQuickView(productId) {
  const product = await dataSource.findProductById(productId);

  if (!product) {
    // eslint-disable-next-line no-console
    console.error(`Product not found: ${productId}`);
    return;
  }

  quickViewImage.src = product.Images.PrimaryLarge;
  quickViewImage.alt = product.NameWithoutBrand;

  quickViewBrand.textContent = product.Brand.Name;
  quickViewName.textContent = product.NameWithoutBrand;
  quickViewPrice.textContent = `$${product.FinalPrice.toFixed(2)}`;
  quickViewColor.textContent = `Color: ${product.Colors[0].ColorName}`;

  quickViewDescription.innerHTML = product.DescriptionHtmlSimple;

  modal.classList.remove("hidden");
}

listElement.addEventListener("click", (event) => {
  const quickViewButton = event.target.closest(".quick-view");

  if (!quickViewButton) {
    return;
  }

  const productId = quickViewButton.dataset.id;

  openQuickView(productId);
});

closeModalButton.addEventListener("click", () => {
  modal.classList.add("hidden");
});

modal.addEventListener("click", (event) => {
  if (event.target === modal) {
    modal.classList.add("hidden");
  }
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    modal.classList.add("hidden");
  }
});

// detect changes in the product sorting menu
const sortMenu = document.querySelector("#sort-products");

sortMenu.addEventListener("change", (event) => {
  const selectedOption = event.target.value;

  productList.sortProducts(selectedOption);
});

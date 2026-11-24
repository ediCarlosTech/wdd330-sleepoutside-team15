import { loadheaderfooter, getParam } from "./utils.mjs";
import ProductData from "./ProductData.mjs";
import ProductList from "./ProductList.mjs";

// Header and footer loader (updates the cart count on the backpack icon)
loadheaderfooter();

// get the category from the URL, form "?category=<category>"
const category = getParam("category");

// turn the category into a title, using wordslice and toUpper
const categoryName = category
  .split("-")
  .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
  .join(" ");


// changes the title and the product category name
  document.querySelector(".products h2").textContent = `Top Products: ${categoryName}`;
  document.title = `Sleep Outside | ${categoryName} `;
  
// the list on the page where the product cards will go
const listElement = document.querySelector(".product-list");
// the data obtains the products from the API
const dataSource = new ProductData();
// create the product list for the category and load the products into the page
const productList = new ProductList(category, dataSource, listElement );
productList.init() ;

// detect changes in the product sorting menu
const sortMenu = document.querySelector("#sort-products");
sortMenu.addEventListener("change", (event) => {
  const selectedOption = event.target.value;

  productList.sortProducts(selectedOption);
});

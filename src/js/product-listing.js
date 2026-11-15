import ProductData from "./ProductData.mjs";
import ProductList from "./ProductList.mjs";
import { loadheaderfooter, getParam } from "./utils.mjs";

loadheaderfooter();

const category = getParam("category");
const categoryName = category
    .split("-")
    .map((word) => word[0].toUpperCase() + word.slice(1))
    .join(" ");
document.querySelector(".title").textContent = `Top Products: ${categoryName}`;
const dataSource = new ProductData();
const listElement = document.querySelector(".product-list");

const productList = new ProductList(category, dataSource, listElement);
productList.init();

const sortMenu = document.querySelector("#sort-products");

sortMenu.addEventListener("change", (event) => {
    productList.sortProducts(event.target.value);
});
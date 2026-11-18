import ProductData from "./ProductData.mjs";
import ProductList from "./ProductList.mjs";
import { getParam } from "./utils.mjs";

const dataSource = new ProductData();

const category = getParam("category");

const productList = new ProductList(
  category,
  dataSource,
  document.querySelector(".product-list"),
);
productList.init();

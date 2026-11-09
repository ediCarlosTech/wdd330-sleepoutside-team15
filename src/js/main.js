import Alert from "./Alert.js";
import { updateCartCount } from "./utils.mjs";

new Alert();
import ProductData from "./ProductData.mjs";
import ProductList from "./ProductList.mjs";

// Update number of items in the cart to the backpack icon
updateCartCount();

// the data source that reads the product data from "json/tents.json"
const dataSource = new ProductData("tents");

// the list on the home page where the product cards will go
const listElement = document.querySelector(".product-list");

// create the tent product list and load the products
const productList = new ProductList("tents", dataSource, listElement);
productList.init();

//
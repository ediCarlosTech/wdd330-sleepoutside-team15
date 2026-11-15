import { loadheaderfooter, getParam } from "./utils.mjs";
import ProductData from "./ProductData.mjs";
import ProductDetails from "./ProductDetails.mjs";

// Header and footer loader (updates the cart count on the backpack icon)
loadheaderfooter()

// get the product ID from the URL, for example "?product=880RR"
const productId = getParam("product");

// the data source that looks up products in the API
const dataSource = new ProductData();

// create the product details for this page and render them
const product = new ProductDetails(productId, dataSource);
product.init();

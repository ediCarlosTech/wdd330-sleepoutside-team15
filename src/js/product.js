import { getParam } from "./utils.mjs";
import ProductData from "./ProductData.mjs";
import ProductDetails from "./ProductDetails.mjs";

// get the product ID from the URL, for example "?product=880RR"
const productId = getParam("product");
// the data source that looks up products in "json/tents.json"
const dataSource = new ProductData("tents");

// create the product details for this page and render them
const product = new ProductDetails(productId, dataSource);
product.init();

import { loadheaderfooter, getParam, breadcrumb } from "./utils.mjs";
import ExternalServices from "./ExternalServices.mjs";
import ProductDetails from "./ProductDetails.mjs";

// Header and footer loader (updates the cart count on the backpack icon)
loadheaderfooter();

breadcrumb();

// get the product ID from the URL
const productId = getParam("product");
// the data source that looks up the product in the API
const dataSource = new ExternalServices();
// create the product details for this page and render them
const product = new ProductDetails(productId, dataSource);
product.init();

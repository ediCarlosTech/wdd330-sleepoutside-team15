import Alert from "./Alert.js";
import { loadheaderfooter } from "./utils.mjs";

// show the alert messages from "json/alerts.json" at the top of the page
new Alert();

// Header and footer loader (it also updates the cart count on the backpack icon)
loadheaderfooter();

// the product list and sort menu moved to "js/product-listing.js",


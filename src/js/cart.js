import { loadheaderfooter,breadcrumb } from "./utils.mjs";
import ShoppingCart from "./ShoppingCart.mjs";

// Header and footer loader
loadheaderfooter();


// the cart is saved in local storage under "so-cart"
// the items are rendered into the ".product-list" element
const listElement = document.querySelector(".product-list");
const cart = new ShoppingCart("so-cart", listElement);
cart.init();

// add the breadcrumb below the header
const listCount = document.querySelectorAll(".cart-card");
breadcrumb(listCount.length);

// Cart functions moved to ShoppingCart.mjs

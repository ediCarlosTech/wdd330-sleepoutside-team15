import { getLocalStorage, setLocalStorage } from "./utils.mjs";
import ProductData from "./ProductData.mjs";
import getParam from "./utils.mjs";
import ProductDetails from "./ProductDetails.mjs";

const dataSource = new ProductData("tents");
const productId = getParam('product');
const product = new ProductDetails(productId, dataSource);
product.init();


//console.log(dataSource.findProductById(productId));

function addProductToCart(product) {
  // get the current cart
  let cart = getLocalStorage("so-cart") || [];

  // set it to an array if it is not
  if (!Array.isArray(cart)) {
    cart = [cart];
  }

  // If the product is in the chart change the quantity
  const existing = cart.find((item) => item.Id === product.Id);
  if (existing) {
    // cap the quantity at 99
    existing.qty = Math.min((existing.qty || 1) + 1, 99);
  } else {
    cart.push({ ...product, qty: 1 });
  }

  setLocalStorage("so-cart", cart);
}

// // add to cart button event handler
// async function addToCartHandler(e) {
//   const product = await dataSource.findProductById(e.target.dataset.id);
//   addProductToCart(product);
// }

// // add listener to Add to Cart button
// document
//   .getElementById("addToCart")
//   .addEventListener("click", addToCartHandler);


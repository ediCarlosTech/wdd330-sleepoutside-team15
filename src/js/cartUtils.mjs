import {
  getLocalStorage,
  setLocalStorage,
  updateCartCount,
  animateCartIcon
} from "./utils.mjs";

// Maximum quantity allowed for each product
const MAX_QTY = 99;

// Add a product to the shopping cart
export function addToCart(product) {
  // Get the current cart
  let cart = getLocalStorage("so-cart") || [];

  // Ensure the cart is an array
  if (!Array.isArray(cart)) {
    cart = [cart];
  }

  // Check if the product already exists
  const existing = cart.find((item) => item.Id === product.Id);

  if (existing) {
    // Increase quantity without exceeding the limit
    existing.qty = Math.min((existing.qty || 1) + 1, MAX_QTY);
  } else {
    // Add a new product
    cart.push({ ...product, qty: 1 });
  }

  // Save the updated cart
  setLocalStorage("so-cart", cart);

  // Update the cart counter
  updateCartCount();

  // Animate the cart icon
  animateCartIcon();
}
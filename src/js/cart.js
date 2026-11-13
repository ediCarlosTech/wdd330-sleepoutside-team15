import { getLocalStorage, setLocalStorage, updateCartCount } from "./utils.mjs";

// the most of one product allowed in the cart (same limit as the product page)
const MAX_QTY = 99;

// get the cart from local storage, always as an array
function getCart() {
  // "so-cart" is null when nothing has been added yet
  let cart = getLocalStorage("so-cart") || [];

  // set it to an array if it is not (older carts saved a single product)
  if (!Array.isArray(cart)) {
    cart = [cart];
  }

  return cart;
}

function renderCartContents() {
  const cartItems = getCart();
  const productList = document.querySelector(".product-list");
  const cartFooter = document.querySelector(".cart-footer");

  // Update number of items in the cart to the backpack icon 
  updateCartCount();

  // empty cart: show a message and keep the footer hidden
  if (cartItems.length === 0) {
    productList.innerHTML = "<li>Your cart is empty.</li>";
    cartFooter.classList.add("hide");
    return;
  }

  const htmlItems = cartItems.map((item) => cartItemTemplate(item));
  productList.innerHTML = htmlItems.join("");

  // the cart has items: show the footer and fill in the total
  cartFooter.classList.remove("hide");
  document.querySelector(".cart-total").textContent =
    `Total: $${getCartTotal(cartItems)}`;
}

function cartItemTemplate(item) {
  const qty = item.qty || 1;

  // each button carries the product ID in "data-id" and what it does in
  // "data-action" so the click listener knows which item to change
  const newItem = `<li class="cart-card divider">
  <button class="cart-card__remove" data-id="${item.Id}" data-action="remove" aria-label="Remove ${item.Name}">X</button>
  <a href="#" class="cart-card__image">
    <img
      src="${item.Image}"
      alt="${item.Name}"
    />
  </a>
  <a href="#">
    <h2 class="card__name">${item.Name}</h2>
  </a>
  <p class="cart-card__color">${item.Colors[0].ColorName}</p>
  <div class="cart-card__quantity">
    <button class="cart-card__qty-btn" data-id="${item.Id}" data-action="decrease" aria-label="Decrease quantity">-</button>
    <span>${qty}</span>
    <button class="cart-card__qty-btn" data-id="${item.Id}" data-action="increase" aria-label="Increase quantity">+</button>
  </div>
  <p class="cart-card__price">$${(item.FinalPrice * qty).toFixed(2)}</p>
</li>`;

  return newItem;
}

// add up price x quantity for every item in the cart
function getCartTotal(cartItems) {
  const total = cartItems.reduce(
    (sum, item) => sum + item.FinalPrice * (item.qty || 1),
    0,
  );
  return total.toFixed(2);
}

// change the cart for one product, then save it and re-render the cart
// action is "increase", "decrease", or "remove"
function updateCart(id, action) {
  let cart = getCart();
  const item = cart.find((cartItem) => cartItem.Id === id);

  if (!item) {
    return;
  }

  const qty = item.qty || 1;

  if (action === "increase") {
    // cap the quantity at 99
    item.qty = Math.min(qty + 1, MAX_QTY);
  } else if (action === "decrease") {
    item.qty = qty - 1;
  }

  // "remove", or "-" pressed when the quantity was 1, takes the item out
  if (action === "remove" || item.qty < 1) {
    cart = cart.filter((cartItem) => cartItem.Id !== id);
  }

  setLocalStorage("so-cart", cart);
  renderCartContents();
}

// one listener on the list handles every "X", "-", and "+" button
// Rebuild cart HTML is after every change, so a listener added to each button
// would be thrown away on every refresh.
document.querySelector(".product-list").addEventListener("click", (e) => {
  // find the button that was clicked, if any by action type
  const button = e.target.closest("button[data-action]");
  if (button) {
    updateCart(button.dataset.id, button.dataset.action);
  }
});

renderCartContents();

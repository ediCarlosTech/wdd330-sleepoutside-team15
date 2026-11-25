import {
  getLocalStorage,
  setLocalStorage,
  updateCartCount,
  renderListWithTemplate,
  imageHandler
} from "./utils.mjs";

// the most of one product allowed in the cart (same limit as the product page)
const MAX_QTY = 99;

// returns the HTML for one item in the cart
function cartItemTemplate(item) {
  const qty = item.qty || 1;

  // each button carries the product ID in "data-id" and what it does in
  // "data-action" so the click listener knows which item to change
  // the imageHandler assign all responsive images. 
  return `<li class="cart-card divider">
  <button class="cart-card__remove" data-id="${item.Id}" data-action="remove" aria-label="Remove ${item.Name}">X</button>
  <a href="#" class="cart-card__image">
    ${imageHandler(item)}
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
}

// shows the items in the cart and lets the customer change or remove them
export default class ShoppingCart {
  constructor(key, listElement) {
    // the local storage key the cart is saved under, for example "so-cart"
    this.key = key;
    // the HTML element the cart items are rendered into
    this.listElement = listElement;
  }

  init() {
    // one listener on the list handles every "X", "-", and "+" button
    // the cart HTML is rebuilt after every change, so a listener added to
    // each button would be thrown away on every refresh
    this.listElement.addEventListener("click", (e) => {
      // find the button that was clicked, if any, by its action
      const button = e.target.closest("button[data-action]");
      if (button) {
        this.updateCart(button.dataset.id, button.dataset.action);
      }
    });

    this.renderCartContents();
  }

  // get the cart from local storage, always as an array
  getCart() {
    // the cart is null when nothing has been added yet
    let cart = getLocalStorage(this.key) || [];

    // set it to an array if it is not (older carts saved a single product)
    if (!Array.isArray(cart)) {
      cart = [cart];
    }

    return cart;
  }

  // add up price x quantity for every item in the cart
  getCartTotal(cartItems) {
    const total = cartItems.reduce(
      (sum, item) => sum + item.FinalPrice * (item.qty || 1),
      0,
    );
    return total.toFixed(2);
  }

  renderCartContents() {
    const cartItems = this.getCart();
    const cartFooter = document.querySelector(".cart-footer");

    // update the number of items on the backpack icon
    updateCartCount();

    // empty cart: show a message and keep the footer hidden
    if (cartItems.length === 0) {
      this.listElement.innerHTML = "<li>Your cart is empty.</li>";
      cartFooter.classList.add("hide");
      return;
    }

    // the shared helper builds a card for every item with the template
    // "afterbegin" and true: insert at the start of the list and clear it first
    renderListWithTemplate(
      cartItemTemplate,
      this.listElement,
      cartItems,
      "afterbegin",
      true,
    );

    // the cart has items: show the footer and fill in the total
    cartFooter.classList.remove("hide");
    document.querySelector(".cart-total").textContent =
      `Total: $${this.getCartTotal(cartItems)}`;
  }

  // change the cart for one product, then save it and re-render the cart
  // action is "increase", "decrease", or "remove"
  updateCart(id, action) {
    let cart = this.getCart();
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

    setLocalStorage(this.key, cart);
    this.renderCartContents();
  }
}

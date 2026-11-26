// wrapper for querySelector...returns matching element
function qs(selector, parent = document) {
  return parent.querySelector(selector);
}

// retrieve data from localstorage
function getLocalStorage(key) {
  return JSON.parse(localStorage.getItem(key));
}

// save data to local storage
function setLocalStorage(key, data) {
  localStorage.setItem(key, JSON.stringify(data));
}

// set a listener for both touchend and click
function setClick(selector, callback) {
  qs(selector).addEventListener("touchend", (event) => {
    event.preventDefault();
    callback();
  });
  qs(selector).addEventListener("click", callback);
}

// get the parameter value from the URL query string
// example: for "product_pages/?product=880RR", getParam("product") would return "880RR"
function getParam(param) {
  // the part of the URL after the "?"
  const queryString = window.location.search;
  // URLSearchParams makes it easy to read the parameters by name
  const urlParams = new URLSearchParams(queryString);
  // returns null if the parameter is not in the URL
  return urlParams.get(param);
}

// render a list of items into an element using a template function
// templateFn: a function that takes one item and returns its HTML string
// parentElement: the element to put the HTML into
// list: the array of items to render
// position: where to insert the HTML 
// clear: is true to empty the element, but is false by default
function renderListWithTemplate(
  templateFn,
  parentElement,
  list,
  position = "afterbegin",
  clear = false,
) {
  // call the template once for each item, giving an array of HTML strings
  const htmlStrings = list.map(templateFn);

  // remove anything already in the element if asked to
  if (clear) {
    parentElement.innerHTML = "";
  }

  // join the HTML strings into one and insert at the current position
  parentElement.insertAdjacentHTML(position, htmlStrings.join(""));
}

// Render the header and footer tags with the text in the template.
function renderWithTemplate(
  template,
  parentElement,
  data,
  callback) {
  parentElement.innerHTML = template;

  if (callback) {
    callback(data);
  }
}

// loads the template with the text of a give file.
async function loadTemplate(path) {
  const res = await fetch(path);
  const template = await res.text();
  return template;
}

// remove cart items saved before the products came from the API
// those items came from the old local JSON files, so their prices or IDs can be
// out of date; API products have "Images", the old ones do not
// the customer adds them again and sees the current price
// this only has to run once: after that, every item in the cart comes from the API
// "so-cart-checked" is saved in local storage so it is not checked again
function removeOldCartItems() {
  // already checked on an earlier visit
  if (getLocalStorage("so-cart-checked")) return;

  let cart = getLocalStorage("so-cart");

  // nothing saved yet means no old items to remove
  if (cart) {
    // older carts saved a single product instead of an array
    if (!Array.isArray(cart)) {
      cart = [cart];
    }

    const apiItems = cart.filter((item) => item.Images);

    // only save when something was removed
    if (apiItems.length !== cart.length) {
      setLocalStorage("so-cart", apiItems);
    }
  }

  // remember the check is done
  setLocalStorage("so-cart-checked", true);
}

// Loads the page with the standard footer and header
async function loadheaderfooter() {
  // runs first, before the page or the cart badge reads the cart
  removeOldCartItems();

  const headerTemplate = await loadTemplate("../partials/header.html");
  const headerElement = document.querySelector("#main-header");
  renderWithTemplate(headerTemplate, headerElement);
  // the cart badge (".cartItemsQty") is part of the header, so it only exists
  // after the header is loaded: update the count now, on every page
  updateCartCount();

  const footerTemplate = await loadTemplate("../partials/footer.html");
  const footerElement = document.querySelector("#dfooter");
  renderWithTemplate(footerTemplate, footerElement);
}

function getQtyItems() {
  let cart = getLocalStorage("so-cart") || [];

  const qty = cart.reduce(
    // count 1 for items saved without a "qty"
    (sum, item) => sum + (item.qty || 1),
    0,
  );

  return qty;
}

function updateCartCount() {
  const cartQty = qs(".cartItemsQty");
  if (!cartQty) return;

  const qty = getQtyItems();
  cartQty.textContent = qty;
  cartQty.classList.toggle("hide", qty === 0);
}

// restarts a CSS animation on an element, even if it is already playing
function restartAnimation(el) {
  if (!el) return;
  el.classList.remove("cart-animate");
  // forces a reflow so the browser plays the animation again
  void el.offsetWidth;
  el.classList.add("cart-animate");
  el.addEventListener(
    "animationend",
    () => el.classList.remove("cart-animate"),
    { once: true },
  );
}

// animates the cart (backpack) icon and its quantity badge
function animateCartIcon() {
  restartAnimation(qs(".cart svg"));
  restartAnimation(qs(".cartItemsQty"));
}

// add responsive images to all products
function imageHandler(product) {
  // const { PrimaryMedium, PrimaryLarge, PrimaryExtraLarge } = product.Images;

  // // Display responsive product image
  // document.getElementById("productImageEstraLarge").srcset = PrimaryExtraLarge;
  // document.getElementById("productImageSmall").srcset = PrimaryMedium;
  // document.getElementById("productImageMedium").srcset = PrimaryLarge;

  // const productImage = document.getElementById("productImage");
  // productImage.src = PrimaryExtraLarge;
  // productImage.alt = product.NameWithoutBrand;
  return `<picture>
      <source media="(min-width: 1024px)" srcset="${product.Images.PrimaryExtraLarge}">
      <source media="(min-width: 768px)" srcset="${product.Images.PrimaryLarge}">
      <img src="${product.Images.PrimaryMedium}" alt="Image of ${product.NameWithoutBrand}" />
      </picture>`
}
// Display the breadcrumbs; receives the totol count of items (im refining this module)
function breadcrumb(itemCount = 0) {
  // get the category from the url bar
  const urlParams = new URLSearchParams(window.location.search);
  const preCategory = urlParams.get("category");
  let category = ""

  if (preCategory) {
    category = preCategory.charAt(0).toUpperCase() + preCategory.slice(1);;
  }

  // contain custom text and item count for the the specific section 
  // (I'll add some new features, but this works fine)
  const wholeBread = {
    Checkout: "Cart > Checkout",
    Tents: `Product Category > ${category} > (${itemCount} items)`,
    Backpacks: `Product Category > ${category} > (${itemCount} items)`,
    Hammocks: `Product Category > ${category} > (${itemCount} items)`,
    "Sleeping Bags": `Product Category > ${category} > (${itemCount} items)`,
    "Product Details": `Product Category > ${category}`,
    "My Wishlist": `My Whishlist > (${itemCount} items)`,
    Cart: `Cart > (${itemCount} items)`
  }

  const breaDisplay = document.querySelector("#bread")
  const current_page = document.title

  let result = current_page.replace("Sleep Outside |", "").trim()

  // search the title in the "wholeBread" object
  if (result in wholeBread) {
    result = wholeBread[result];
  }

  breaDisplay.innerHTML = `<p>Home > ${result}</p>`
}

function alertMessage(message, scroll = true) {
  const alert = document.createElement("div");
  alert.className = "alert";

  const text = document.createElement("p");
  text.textContent = message;
  const close = document.createElement("button");
  close.type = "button";
  close.textContent = "X";
  close.setAttribute("aria-label", "Dismiss message");
  close.addEventListener("click", () => alert.remove());
  alert.append(text, close);

  const main = qs("main");
  main.prepend(alert);
  if (scroll) window.scrollTo(0, 0);
}

function removeAllAlerts() {
  document.querySelectorAll(".alert").forEach((alert) => alert.remove());
}

// add new utility functions to this list so other modules can import them
export {
  qs,
  getLocalStorage,
  setLocalStorage,
  setClick,
  getParam,
  getQtyItems,
  updateCartCount,
  animateCartIcon,
  renderListWithTemplate,
  renderWithTemplate,
  loadheaderfooter,
  imageHandler,
  breadcrumb,
  alertMessage,
  removeAllAlerts
};

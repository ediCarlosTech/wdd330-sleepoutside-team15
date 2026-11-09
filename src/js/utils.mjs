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


function getQtyItems() {
  let cart = getLocalStorage("so-cart") || [];

  const qty = cart.reduce(
    (sum, item) => sum + item.qty,
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

// add new utility functions to this list so other modules can import them
export {
  qs,
  getLocalStorage,
  setLocalStorage,
  setClick,
  getParam,
  getQtyItems,
  updateCartCount,
  renderListWithTemplate,
};

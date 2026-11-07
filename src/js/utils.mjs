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

// get a parameter value from the URL query string
// example: for "product_pages/?product=880RR", getParam("product") returns "880RR"
function getParam(param) {
  // the part of the URL after the "?"
  const queryString = window.location.search;
  // URLSearchParams makes it easy to read the parameters by name
  const urlParams = new URLSearchParams(queryString);
  // returns null if the parameter is not in the URL
  return urlParams.get(param);
}

// add new utility functions to this list so other modules can import them
export { qs, getLocalStorage, setLocalStorage, setClick, getParam };

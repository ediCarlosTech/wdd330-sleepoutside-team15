import { loadheaderfooter } from "./utils.mjs";
import CheckoutProcess from "./CheckoutProcess.mjs";

// Load header and footer
loadheaderfooter();

// Initialize checkout
const checkout = new CheckoutProcess(
  "so-cart",
  "#order-summary"
);

checkout.init();

// Calculate totals when ZIP code changes
const zipInput = document.querySelector("#zip");

zipInput.addEventListener("change", () => {
  checkout.calculateOrderTotal();
});

// Get checkout form
const checkoutForm = document.querySelector("#checkoutForm");

// Handle form submission
// the "submit" event fires once the HTML validation passes
checkoutForm.addEventListener("submit", (event) => {
  // keep the form from reloading the page; the order is sent with fetch
  event.preventDefault();

  // checkValidity() is false if any field breaks rules
  // reportValidity() shows the browser's messages for fields
  const isValid = checkoutForm.checkValidity();
  checkoutForm.reportValidity();

  // stop here if the form is not valid
  if (isValid) {
    // CheckoutProcess catches its own errors and shows them as alerts
    checkout.checkout(checkoutForm);
  }
});

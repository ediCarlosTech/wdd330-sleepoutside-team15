import { loadheaderfooter, breadcrumb } from "./utils.mjs";
import CheckoutProcess from "./CheckoutProcess.mjs";

// Load header and footer
loadheaderfooter();

// add the breadcrumb below the header
breadcrumb();

// Initialize checkout
const checkout = new CheckoutProcess("so-cart", "#order-summary");

checkout.init();

// Calculate totals when ZIP code changes
const zipInput = document.querySelector("#zip");

zipInput.addEventListener("change", () => {
  checkout.calculateOrderTotal();
});

// Get checkout form
const checkoutForm = document.querySelector("#checkoutForm");

// Handle form submission
checkoutForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  if (!checkoutForm.reportValidity()) {
    return;
  }

  try {
    await checkout.checkout(checkoutForm);
  } catch (error) {
    console.error("Checkout request failed:", error);
  }
});

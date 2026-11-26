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
// const checkoutForm = document.querySelector("#checkoutForm");

// Handle form submission

document.querySelector('#checkoutSubmit').addEventListener('click', (e) => {
  e.preventDefault();
  const myForm = document.forms[0];
  const chk_status = myForm.checkValidity();
  myForm.reportValidity();
  if(chk_status)
    checkout.checkout();
  });
// checkoutForm.addEventListener("submit", async (event) => {
//   event.preventDefault();

//   if (!checkoutForm.reportValidity()) {
//     return;
//   }

//   try {
//     await checkout.checkout(checkoutForm);
//   } catch (error) {
//     console.error("Checkout request failed:", error);
//   }
//});

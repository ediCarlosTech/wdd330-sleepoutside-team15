import { loadheaderfooter,  } from "./utils.mjs";
import CheckoutProcess from "./CheckoutProcess.mjs";

// Load the standard header and footer
loadheaderfooter();


// Create checkout instance
const checkout = new CheckoutProcess(
    "so-cart",
    "#order-summary"
);

// Initialize checkout process
checkout.init();

// Calculate totals after ZIP code changes
const zipInput = document.querySelector("#zip")

zipInput.addEventListener("change", () => {
    checkout.calculateOrderTotal();
});

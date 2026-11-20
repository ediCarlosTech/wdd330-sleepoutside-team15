import Alert from "./Alert.js";
import { loadheaderfooter } from "./utils.mjs";

// show the alert messages from "json/alerts.json" at the top of the page
new Alert();

// Header and footer loader (it also updates the cart count on the backpack icon)
loadheaderfooter();

const newsletterForm = document.querySelector("#newsletter-form");
const newsletterMessage = document.querySelector("#newsletter-message");

newsletterForm?.addEventListener("submit", (event) => {
  event.preventDefault();
  newsletterMessage.textContent =
    "Thanks for your interest! This demo isn't connected to a mailing list, so your email hasn't been submitted.";
});

// the product list and sort menu moved to "js/product-listing.js",

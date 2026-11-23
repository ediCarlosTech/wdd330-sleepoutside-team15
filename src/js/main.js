import Alert from "./Alert.js";
import {
  getLocalStorage,
  setLocalStorage,
  loadheaderfooter,
} from "./utils.mjs";

// show the alert messages from "json/alerts.json" at the top of the page
new Alert();

// Header and footer loader (it also updates the cart count on the backpack icon)
loadheaderfooter();

// variables for modal manipulation
const registrationModal = document.querySelector("#registration-modal");
const closeRegistrationButton = document.querySelector("#close-registration");
const registrationForm = document.querySelector("#registration-form");
const registrationEmail = document.querySelector("#registration-email");
const registrationMessage = document.querySelector("#registration-message");

const newsletterForm = document.querySelector("#newsletter-form");
const newsletterMessage = document.querySelector("#newsletter-message");

function hasSeenRegistration() {
  return getLocalStorage("so-registration-seen");
}

function openRegistrationModal() {
  registrationModal.classList.remove("hidden");
  registrationEmail.focus();
}

function closeRegistrationModal() {
  registrationModal.classList.add("hidden");
  setLocalStorage("so-registration-seen", true);
}

if (!hasSeenRegistration()) {
  openRegistrationModal();
}

closeRegistrationButton.addEventListener("click", () => {
  closeRegistrationModal();
});

registrationModal.addEventListener("click", (event) => {
  if (event.target === registrationModal) {
    closeRegistrationModal();
  }
});

document.addEventListener("keydown", (event) => {
  if (
    event.key === "Escape" &&
    !registrationModal.classList.contains("hidden")
  ) {
    closeRegistrationModal();
  }
});

registrationForm.addEventListener("submit", (event) => {
  event.preventDefault();

  const email = registrationEmail.value.trim();

  if (!email) {
    registrationMessage.textContent = "Please enter your email address.";
    return;
  }

  setLocalStorage("so-registration-seen", true);
  setLocalStorage("so-giveaway-email", email);

  registrationMessage.textContent = "Thanks for registering for the giveaway!";

  setTimeout(closeRegistrationModal, 1500);
});

newsletterForm?.addEventListener("submit", (event) => {
  event.preventDefault();
  newsletterMessage.textContent =
    "Thanks for your interest! This demo isn't connected to a mailing list, so your email hasn't been submitted.";
});

// the product list and sort menu moved to "js/product-listing.js",

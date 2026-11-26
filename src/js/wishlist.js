import {
  getLocalStorage,
  setLocalStorage,
  loadheaderfooter,
  imageHandler,
  breadcrumb
} from "./utils.mjs";

import { addToCart } from "./cartUtils.mjs";

// Load the shared header and footer
loadheaderfooter();

// Get the wishlist from localStorage
const wishlist = getLocalStorage("so-wishlist") || [];

// add the breadcrumb below the header
breadcrumb(wishlist.length);
// Find the HTML element where products will be displayed
const wishlistElement = document.querySelector("#wishlist-items");

// Display a message when the wishlist is empty
function showEmptyWishlist() {
  if (wishlistElement.children.length === 0) {
    const message = document.createElement("p");
    message.textContent = "Your wishlist is empty.";

    wishlistElement.replaceWith(message);
  }
}

// Display the products
if (Array.isArray(wishlist) && wishlist.length > 0) {
  wishlist.forEach((product) => {
    // Create the product card
    const item = document.createElement("li");
    item.classList.add("product-card");

    // Create the product image
    // imageHanndeler adds it reponsive
    const image = document.createElement("div");
    image.innerHTML = imageHandler(product)
    
    // Create the product name
    const name = document.createElement("h2");
    name.classList.add("card__name");
    name.textContent = product.NameWithoutBrand;

    // Create the product price
    const price = document.createElement("p");
    price.classList.add("product-card__price");
    price.textContent = `$${product.FinalPrice.toFixed(2)}`;

    // Create the Move to Cart button
    const moveToCartButton = document.createElement("button");
    moveToCartButton.textContent = "Move to Cart";
    moveToCartButton.type = "button";

    // Move the selected product from wishlist to cart
    moveToCartButton.addEventListener("click", () => {
      // Add the product to the shopping cart
      addToCart(product);

      // Get the current wishlist
      const currentWishlist = getLocalStorage("so-wishlist") || [];

      // Remove the product from the wishlist
      const updatedWishlist = currentWishlist.filter(
        (wishlistItem) => wishlistItem.Id !== product.Id,
      );

      // Save the updated wishlist
      setLocalStorage("so-wishlist", updatedWishlist);

      // Remove the product card from the page
      item.remove();

      // Check whether the wishlist is now empty
      showEmptyWishlist();
    });

    // Create the Remove from Wishlist button
    const removeButton = document.createElement("button");
    removeButton.textContent = "Remove from Wishlist";
    removeButton.type = "button";

    // Remove the selected product from the wishlist
    removeButton.addEventListener("click", () => {
      // Get the current wishlist
      const currentWishlist = getLocalStorage("so-wishlist") || [];

      // Remove the selected product
      const updatedWishlist = currentWishlist.filter(
        (wishlistItem) => wishlistItem.Id !== product.Id,
      );

      // Save the updated wishlist
      setLocalStorage("so-wishlist", updatedWishlist);

      // Remove the product card from the page
      item.remove();

      // Check whether the wishlist is now empty
      showEmptyWishlist();
    });

    // Create a container for the buttons
    const buttonContainer = document.createElement("div");
    buttonContainer.classList.add("wishlist-actions");

    // Add buttons to the container
    buttonContainer.appendChild(moveToCartButton);
    buttonContainer.appendChild(removeButton);

    // Add all elements to the product card
    item.appendChild(image);
    item.appendChild(name);
    item.appendChild(price);
    item.appendChild(buttonContainer);

    // Add the card to the wishlist
    wishlistElement.appendChild(item);
  });
} else {
  // Display a message when the wishlist is empty
  showEmptyWishlist();
}

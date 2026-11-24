import { getLocalStorage, setLocalStorage } from "./utils.mjs";
import { addToCart } from "./cartUtils.mjs";

// Common product detail page
export default class ProductDetails {
  constructor(productId, dataSource) {
    // Product ID obtained from the URL
    this.productId = productId;

    // Product information loaded by init()
    this.product = {};

    // Data source used to retrieve product information
    this.dataSource = dataSource;

    // Currently selected product color
    this.selectedColor = null;
  }

  // Initialize the product details page
  async init() {
    // Retrieve product information
    this.product = await this.dataSource.findProductById(this.productId);

    // Stop if the product does not exist
    if (!this.product) {
      document.querySelector(".product-detail").innerHTML =
        "<p>Sorry, that product could not be found.</p>";
      return;
    }

    // Display product information
    this.renderProductDetails();

    // Update wishlist button
    this.updateWishlistButton();

    // Add product to cart
    document
      .getElementById("addToCart")
      .addEventListener("click", this.addProductToCart.bind(this));

    // Add product to wishlist
    document
      .getElementById("addToWishlist")
      .addEventListener("click", this.addProductToWishlist.bind(this));
  }

  // Add the current product to the shopping cart
  addProductToCart() {
    addToCart(this.product);
  }

  // Add the current product to the wishlist
  addProductToWishlist() {
    // Get the current wishlist from localStorage
    let wishlist = getLocalStorage("so-wishlist") || [];

    // Ensure the wishlist is an array
    if (!Array.isArray(wishlist)) {
      wishlist = [];
    }

    // Check if the product already exists in the wishlist
    const existingProduct = wishlist.find(
      (item) => item.Id === this.product.Id
    );

    // Add the product only if it does not exist
    if (!existingProduct) {
      wishlist.push(this.product);
      setLocalStorage("so-wishlist", wishlist);
    }

    // Update the wishlist button
    this.updateWishlistButton();
  }

  // Update the wishlist button based on product status
  updateWishlistButton() {
    // Get wishlist from localStorage
    const wishlist = getLocalStorage("so-wishlist");

    // Check whether the product exists in the wishlist
    const isInWishlist =
      Array.isArray(wishlist) &&
      wishlist.some((item) => item.Id === this.product.Id);

    // Find the wishlist button
    const button = document.getElementById("addToWishlist");

    // Update button appearance
    if (isInWishlist) {
      button.textContent = "♥ Added to Wishlist";
      button.disabled = true;
    } else {
      button.textContent = "♡ Add to Wishlist";
      button.disabled = false;
    }
  }

  // Display all available product colors
  renderProductColors() {
    // Get available colors
    const colors = Array.isArray(this.product.Colors)
      ? this.product.Colors
      : [];

    // Find the color container
    const container = document.getElementById("productColor");

    // Clear previous content
    container.replaceChildren();

    // Handle products without colors
    if (colors.length === 0) {
      this.selectedColor = null;
      container.textContent = "No colors available";
      return;
    }

    // Select the first color by default
    this.selectedColor = colors[0];

    // Create one button for each available color
    colors.forEach((color, index) => {
      // Create button element
      const button = document.createElement("button");

      button.type = "button";
      button.classList.add("color-option");

      // Add accessibility information
      button.setAttribute("aria-label", color.ColorName);
      button.setAttribute(
        "aria-pressed",
        index === 0 ? "true" : "false"
      );

      // Create image for the color swatch
      const image = document.createElement("img");

      image.src = color.ColorChipImageSrc;
      image.alt = color.ColorName;

      // Add image to button
      button.appendChild(image);

      // Mark first color as selected
      if (index === 0) {
        button.classList.add("selected");
      }

      // Listen for color selection
      button.addEventListener("click", () => {
        this.selectColor(color, button);
      });

      // Add button to the page
      container.appendChild(button);
    });
  }

  // Handle product color selection
  selectColor(color, selectedButton) {
    // Store the selected color
    this.selectedColor = color;

    // Find all color buttons
    const buttons = document.querySelectorAll(
      "#productColor .color-option"
    );

    // Remove selection from all buttons
    buttons.forEach((button) => {
      button.classList.remove("selected");
      button.setAttribute("aria-pressed", "false");
    });

    // Highlight the selected button
    selectedButton.classList.add("selected");
    selectedButton.setAttribute("aria-pressed", "true");
  }

  // Render product information on the page
  renderProductDetails() {
    const product = this.product;

    // Update the browser tab title
    document.title = `Sleep Outside | ${product.Name}`;

    // Display product brand
    document.getElementById("productBrand").textContent =
      product.Brand.Name;

    // Display product name
    document.getElementById("productName").textContent =
      product.NameWithoutBrand;

    // Display responsive product image
    const { PrimaryMedium, PrimaryLarge, PrimaryExtraLarge } = product.Images;

    document.getElementById("productImageSmall").srcset = PrimaryMedium;
    document.getElementById("productImageMedium").srcset = PrimaryLarge;

    const productImage = document.getElementById("productImage");
    productImage.src = PrimaryExtraLarge;
    productImage.alt = product.NameWithoutBrand;

    // Display product price
    document.getElementById("productPrice").textContent =
      `$${product.FinalPrice.toFixed(2)}`;

    // Display all available product colors
    this.renderProductColors();

    // Display product description
    document.getElementById("productDesc").innerHTML =
      product.DescriptionHtmlSimple;

    // Set product ID for the Add to Cart button
    document.getElementById("addToCart").dataset.id =
      product.Id;
  }
}

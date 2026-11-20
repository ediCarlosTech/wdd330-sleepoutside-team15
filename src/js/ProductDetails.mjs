import { getLocalStorage, setLocalStorage } from "./utils.mjs";
import { addToCart } from "./cartUtils.mjs";

// common product detail page for one products
export default class ProductDetails {
  constructor(productId, dataSource) {
    // the product ID from the URL
    this.productId = productId;
    // filled in with the product details by init()
    this.product = {};
    // a ExternalServices instance used to look up the product
    this.dataSource = dataSource;
  }

  async init() {
    // findProductById returns a promise, wait for product details
    // details are needed before the HTML can be rendered
    this.product = await this.dataSource.findProductById(this.productId);

    // stop here, if the ID in the URL does not match a product
    if (!this.product) {
      document.querySelector(".product-detail").innerHTML =
        "<p>Sorry, that product could not be found.</p>";
      return;
    }

    this.renderProductDetails();
    this.updateWishlistButton();

    // add a listener to the "Add to Cart" button, once the HTML is rendered
    // .bind(this) keeps "this" pointing at this ProductDetails instance;
    // without it, "this" would be the button and this.product would be undefined
    document
      .getElementById("addToCart")
      .addEventListener("click", this.addProductToCart.bind(this));

    // Add the selected product to the wishlist
    document
      .getElementById("addToWishlist")
      .addEventListener("click", this.addProductToWishlist.bind(this));
  }

  addProductToCart() {
    addToCart(this.product);
  }

  addProductToWishlist() {
  // Get the current wishlist from localStorage
  let wishlist = getLocalStorage("so-wishlist") || [];

  // Ensure the wishlist is an array
  if (!Array.isArray(wishlist)) {
    wishlist = [];
  }

  // Check if the product is already in the wishlist
  const existingProduct = wishlist.find(
    (item) => item.Id === this.product.Id
  );

  // Add the product only if it does not already exist
  if (!existingProduct) {
    wishlist.push(this.product);
    setLocalStorage("so-wishlist", wishlist);
  }

  this.updateWishlistButton();
}

updateWishlistButton() {
  // Get the wishlist from localStorage
  const wishlist = getLocalStorage("so-wishlist");

  // Check whether the current product is in the wishlist
  const isInWishlist =
    Array.isArray(wishlist) &&
    wishlist.some((item) => item.Id === this.product.Id);

  // Find the wishlist button
  const button = document.getElementById("addToWishlist");

  // Update the button according to the product's status
  if (isInWishlist) {
    button.textContent = "♥ Added to Wishlist";
    button.disabled = true;
  } else {
    button.textContent = "♡ Add to Wishlist";
    button.disabled = false;
  }
}

  renderProductDetails() {
    const product = this.product;

    // add the product name in the browser tab
    document.title = `Sleep Outside | ${product.Name}`;

    document.getElementById("productBrand").textContent = product.Brand.Name;
    document.getElementById("productName").textContent = product.NameWithoutBrand;

    const productImage = document.getElementById("productImage");
    // the API has several image sizes in "Images": the Primarylarge should be used here
    productImage.src = product.Images.PrimaryLarge;
    productImage.alt = product.NameWithoutBrand;

    document.getElementById("productPrice").textContent =
      `$${product.FinalPrice.toFixed(2)}`;
    document.getElementById("productColor").textContent =
      product.Colors[0].ColorName;

    // innerHTML not textContent, the description contains HTML entities

    document.getElementById("productDesc").innerHTML =
      product.DescriptionHtmlSimple;

    document.getElementById("addToCart").dataset.id = product.Id;
  }
}

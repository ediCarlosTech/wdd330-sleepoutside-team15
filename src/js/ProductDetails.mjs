import { getLocalStorage, setLocalStorage, updateCartCount } from "./utils.mjs";

// common product detail page for one products
export default class ProductDetails {
  constructor(productId, dataSource) {
    // the product ID from the URL
    this.productId = productId;
    // filled in with the product details by init()
    this.product = {};
    // a ProductData instance used to look up the product
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

    // add a listener to the "Add to Cart" button, once the HTML is rendered
    // .bind(this) keeps "this" pointing at this ProductDetails instance;
    // without it, "this" would be the button and this.product would be undefined
    document
      .getElementById("addToCart")
      .addEventListener("click", this.addProductToCart.bind(this));
  }

  addProductToCart() {
    // load the the current cart
    let cart = getLocalStorage("so-cart") || [];

    // set it to an array if it is not
    if (!Array.isArray(cart)) {
      cart = [cart];
    }

    // if the product is already in the cart, change the quantity
    const existing = cart.find((item) => item.Id === this.product.Id);

    if (existing) {
      // cap the quantity at 99
      existing.qty = Math.min((existing.qty || 1) + 1, 99);
    } else {
      cart.push({ ...this.product, qty: 1 });
    }

    // set the cart to local storage
    setLocalStorage("so-cart", cart);
   
    // Update number of items in the cart to the backpack icon 
    updateCartCount()
  }

  renderProductDetails() {
    const product = this.product;

    // add the product name in the browser tab
    document.title = `Sleep Outside | ${product.Name}`;

    document.getElementById("productBrand").textContent = product.Brand.Name;
    document.getElementById("productName").textContent = product.NameWithoutBrand;

    const productImage = document.getElementById("productImage");
    productImage.src = product.Image;
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

import { addToCart } from "./cartUtils.mjs";

// things inside the pop-up that can take keyboard focus (used to trap Tab)
const FOCUSABLE =
  "button:not([disabled]), a[href], [tabindex]:not([tabindex='-1'])";

// the quick view pop-up on the product listing page
export default class QuickView {
  constructor(modalElement, dataSource) {
    // the ".modal" element that wraps the pop-up
    this.modal = modalElement;
    // a ExternalServices instance used to look up the product
    this.dataSource = dataSource;
    // the product that is showing right now (null when closed or on an error)
    this.product = null;
    // the "Quick View" button that opened the pop-up, so focus can go back to it
    this.opener = null;
  }

  // set up the listeners once; the pop-up HTML is already on the page
  init() {
    this.modal
      .querySelector("#close-modal")
      .addEventListener("click", () => this.close());

    this.modal
      .querySelector("#quick-view-add")
      .addEventListener("click", () => this.addProductToCart());

    // a click on the dark backdrop (not on the white box) closes it
    this.modal.addEventListener("click", (event) => {
      if (event.target === this.modal) {
        this.close();
      }
    });

    document.addEventListener("keydown", (event) => this.handleKeydown(event));
  }

  isOpen() {
    return !this.modal.classList.contains("hidden");
  }

  // look up the product, fill in the pop-up, and show it
  // opener is the button that was clicked, so focus can return to it on close
  async open(productId, opener = null) {
    this.opener = opener;

    let product = null;
    try {
      product = await this.dataSource.findProductById(productId);
    } catch (err) {
      // a failed request is shown the same way as an unknown product
      product = null;
    }

    if (product) {
      this.renderProduct(product);
    } else {
      this.renderError();
    }

    this.modal.classList.remove("hidden");
    // move focus into the pop-up so keyboard and screen reader users land in it
    this.modal.querySelector("#close-modal").focus();
  }

  close() {
    if (!this.isOpen()) {
      return;
    }

    this.modal.classList.add("hidden");

    // put focus back where the customer was
    if (this.opener) {
      this.opener.focus();
      this.opener = null;
    }
  }

  renderProduct(product) {
    this.product = product;

    const image = this.modal.querySelector("#quick-view-image");
    image.src =
      product.Images?.PrimaryLarge || product.Images?.PrimaryMedium || "";
    image.alt = product.NameWithoutBrand || "";

    this.setText("#quick-view-brand", product.Brand?.Name || "");
    this.setText("#quick-view-name", product.NameWithoutBrand || product.Name);
    this.setText("#quick-view-price", `$${product.FinalPrice.toFixed(2)}`);

    const color = product.Colors?.[0]?.ColorName;
    this.setText("#quick-view-color", color ? `Color: ${color}` : "");

    // innerHTML on purpose: the description from the API contains markup
    this.modal.querySelector("#quick-view-description").innerHTML =
      product.DescriptionHtmlSimple || "";

    this.modal.querySelector("#quick-view-add").disabled = false;
    this.setText("#quick-view-status", "");
  }

  // the product could not be loaded: say so and turn the add button off
  renderError() {
    this.product = null;

    const image = this.modal.querySelector("#quick-view-image");
    image.removeAttribute("src");
    image.alt = "";

    this.setText("#quick-view-brand", "");
    this.setText("#quick-view-name", "Sorry, we could not load this product.");
    this.setText("#quick-view-price", "");
    this.setText("#quick-view-color", "");
    this.modal.querySelector("#quick-view-description").textContent = "";

    this.modal.querySelector("#quick-view-add").disabled = true;
    this.setText("#quick-view-status", "");
  }

  addProductToCart() {
    if (!this.product) {
      return;
    }

    addToCart(this.product);
    // the status line is a live region, so a screen reader announces it
    this.setText(
      "#quick-view-status",
      `${this.product.NameWithoutBrand} was added to your cart.`,
    );
  }

  // Escape closes the pop-up and Tab stays inside it while it is open
  handleKeydown(event) {
    if (!this.isOpen()) {
      return;
    }

    if (event.key === "Escape") {
      this.close();
      return;
    }

    if (event.key === "Tab") {
      this.trapFocus(event);
    }
  }

  trapFocus(event) {
    const focusable = this.modal.querySelectorAll(FOCUSABLE);
    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    // wrap around at either end instead of leaving the pop-up
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  // textContent keeps API values from being read as HTML
  setText(selector, text) {
    this.modal.querySelector(selector).textContent = text;
  }
}

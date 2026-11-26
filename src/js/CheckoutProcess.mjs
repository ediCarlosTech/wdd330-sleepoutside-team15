import { getLocalStorage, setLocalStorage, alertMessage,removeAllAlerts } from "./utils.mjs";
import ExternalServices from "./ExternalServices.mjs";

const taxRate = 0.06

// Convert cart items into the format required by the server
function packageItems(items) {
  return items.map((item) => ({
    id: item.Id,
    name: item.Name,
    price: item.FinalPrice,
    quantity: item.qty || 1
  }));
}

// Convert form data into a JavaScript object
function formDataToJSON(formElement) {
  const formData = new FormData(formElement);
  const convertedJSON = {};

  formData.forEach((value, key) => {
    convertedJSON[key] = value;
  });

  return convertedJSON;
}

export default class CheckoutProcess {

  constructor(key, outputSelector) {
    this.key = key;
    this.outputSelector = outputSelector;

    this.list = [];
    this.itemTotal = 0;
    this.shipping = 0;
    this.tax = 0;
    this.orderTotal = 0;

    this.services = new ExternalServices();
  }

  // Initialize checkout process
  init() {
    this.list = getLocalStorage(this.key) || [];

    if (!Array.isArray(this.list)) {
      this.list = [this.list];
    }

    this.calculateItemSubTotal();
  }

  // Calculate and display item subtotal
  calculateItemSubTotal() {
    this.itemTotal = this.list.reduce(
      (sum, item) => sum + item.FinalPrice * (item.qty || 1),
      0
    );

    const subtotalElement = document.querySelector(
      `${this.outputSelector} #subtotal`
    );

    if (subtotalElement) {
      subtotalElement.textContent = `$${this.itemTotal.toFixed(2)}`;
    }
  }

  // Calculate tax, shipping, and final order total
  calculateOrderTotal() {
    // Calculate 6% sales tax
    this.tax = this.itemTotal * taxRate;

    // Calculate total number of items
    const totalItems = this.list.reduce(
      (sum, item) => sum + (item.qty || 1),
      0
    );

    // Calculate shipping costs
    if (totalItems > 0) {
      this.shipping = 10 + (totalItems - 1) * 2;
    } else {
      this.shipping = 0;
    }

    // Calculate final order total
    this.orderTotal =
      this.itemTotal +
      this.tax +
      this.shipping;

    this.displayOrderTotals();
  }

  // Display calculated totals in HTML
  displayOrderTotals() {
    const taxElement = document.querySelector(
      `${this.outputSelector} #tax`
    );

    const shippingElement = document.querySelector(
      `${this.outputSelector} #shipping`
    );

    const totalElement = document.querySelector(
      `${this.outputSelector} #orderTotal`
    );

    if (taxElement) {
      taxElement.textContent = `$${this.tax.toFixed(2)}`;
    }

    if (shippingElement) {
      shippingElement.textContent = `$${this.shipping.toFixed(2)}`;
    }

    if (totalElement) {
      totalElement.textContent = `$${this.orderTotal.toFixed(2)}`;
    }
  }

  // Prepare the order information
  async checkout(form) {

    // Get customer information from the form
    const order = formDataToJSON(form);

    // Calculate final totals
    this.calculateOrderTotal();

    // Add order date
    order.orderDate = new Date().toISOString();

    // Add order totals
    order.orderTotal = this.orderTotal.toFixed(2);
    order.shipping = this.shipping;
    order.tax = this.tax.toFixed(2);

    // Add products to the order
    order.items = packageItems(this.list);


    try {
      // Send order to the server
      await this.services.checkout(order);
      setLocalStorage(this.key, []);
      window.location.assign("/checkout/success.html");

    } catch (err) {

      removeAllAlerts();
      const messages = error.message && typeof error.message === "object"
        ? Object.values(error.message)
        : [error.message || "Unable to place your order."];
      
      messages.forEach((message) => alertMessage(message));

    }
  }
}
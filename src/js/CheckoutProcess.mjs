import {getLocalStorage} from "./utils.mjs"

const taxRate = 0.06

export default class CheckoutProcess {

  constructor(key, outputSelector) {
    this.key = key;
    this.outputSelector = outputSelector;

    this.list = [];
    this.itemTotal = 0;
    this.shipping = 0;
    this.tax = 0;
    this.orderTotal = 0;
}

init() {
    this.list = getLocalStorage(this.key) || [];

    if (!Array.isArray(this.list)) { 
        this.list = [this.list];
    }

    this.calculateItemSubTotal();
}


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

  calculateOrderTotal() {

    this.tax = this.itemTotal * taxRate

    // Calculate the total number of items
    const totalItems = this.list.reduce((sum, item) => sum + (item.qty || 1),
    0
    );

    // Calculate shipping costs
    if (totalItems > 0) {
        this.shipping = 10 + (totalItems -1) * 2;
    } else {
        this.shipping = 0;
    }

    // Calculate final order total
    this.orderTotal = 
        this.itemTotal +
        this.tax + 
        this.shipping;

    // display the calculated valued
    this.displayOrderTotals();
  }

  // Display tax,shipping, and order total in HTML
  displayOrderTotals() {

    const tax = document.querySelector(`${this.outputSelector} #tax`);

    const shipping = document.querySelector(`${this.outputSelector} #shipping`);

    const orderTotal = document.querySelector(`${this.outputSelector} #orderTotal`);

    shipping.textContent =  `$${this.shipping.toFixed(2)}`;

    tax.textContent =  `$${this.tax.toFixed(2)}`;

    orderTotal.textContent = `$${this.orderTotal.toFixed(2)}`;

  }
}

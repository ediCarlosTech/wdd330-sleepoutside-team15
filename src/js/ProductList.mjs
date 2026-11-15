import { renderListWithTemplate } from "./utils.mjs";

// returns the HTML for one product card
function productCardTemplate(product) {
  // verify if the product has a discount
  const isDiscounted = product.FinalPrice < product.SuggestedRetailPrice;

  // calculate amount saved
  const amountSaved = isDiscounted
    ? (product.SuggestedRetailPrice - product.FinalPrice).toFixed(2)
    : 0;

  // create a saving badge element to insert later into template card
  const discountBadge = isDiscounted
    ? `<span class="discount-badge"> Save $${amountSaved}</span>`
    : "";

  const priceDisplay = isDiscounted
    ? `<p class="product-card__price">
     <span class="original-price">$${product.SuggestedRetailPrice.toFixed(2)}</span>
     $${product.FinalPrice.toFixed(2)}
     </p>
     `
    : `<p class="product-card__price">$${product.FinalPrice.toFixed(2)}</p>`;

  return `<li class="product-card">
    <a href="/product_pages/index.html?product=${product.Id}">
      ${discountBadge}
      <img src="${product.Images.PrimaryMedium}" alt="Image of ${product.NameWithoutBrand}" />
      <h3 class="card__brand">${product.Brand.Name}</h3>
      <h2 class="card__name">${product.NameWithoutBrand}</h2>
      ${priceDisplay}
    </a>
  </li>`;
}

// builds a list of product cards in HTML from an array of products
export default class ProductList {
  constructor(category, dataSource, listElement, criteria = false) {
    // the product category to list, for example "tents"
    this.category = category;
    // a ProductData instance used to get the products (or an array if criteria is true)
    this.dataSource = dataSource;
    // the HTML element the product cards are rendered into
    this.listElement = listElement;
    // determines if an array is passed
    this.criteria = criteria;
  }

  async init() {
    let list = [];
    if (this.criteria === true) {
      // assigns an array
      list = this.dataSource;
    } else {
      // fetch the products of this category from the API
      list = await this.dataSource.getData(this.category);
    }
    // preserve the original order
    this.originalProducts = [...list];
    // store products for sorting
    this.products = [...list];
    // display products in their original order
    this.renderList(this.products);
  }

  sortProducts(option) {
    if (option === "default") {
      this.products = [...this.originalProducts];
    }

    if (option === "price-asc") {
      this.products.sort((a, b) => a.FinalPrice - b.FinalPrice);
    }

    if (option === "price-desc") {
      this.products.sort((a, b) => b.FinalPrice - a.FinalPrice);
    }

    if (option === "name-asc") {
      this.products.sort((a, b) =>
        a.NameWithoutBrand.localeCompare(b.NameWithoutBrand),
      );
    }

    if (option === "name-desc") {
      this.products.sort((a, b) =>
        b.NameWithoutBrand.localeCompare(a.NameWithoutBrand),
      );
    }

    this.renderList(this.products);
  }

  // build a card for every product and put them all on the page
  renderList(list) {
    renderListWithTemplate(
      productCardTemplate,
      this.listElement,
      list,
      "afterbegin",
      true,
    );
  }
}
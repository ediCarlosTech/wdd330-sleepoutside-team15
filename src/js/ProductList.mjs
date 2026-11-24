import { renderListWithTemplate } from "./utils.mjs";

// returns the HTML for one product card
// the markup matches the product cards on the home page ("index.html")
function productCardTemplate(product) {
  // verify if the product has a discount 
  const isDiscounted = product.FinalPrice < product.SuggestedRetailPrice;
  
  // calculate amount saved
  const amountSaved = isDiscounted ? (product.SuggestedRetailPrice - product.FinalPrice).toFixed(2) : 0;
  
  // create a saving badge element to insert later into template card 
  const discountBadge = isDiscounted ? `<span class="discount-badge"> Save $${amountSaved}</span>` : "";
  
  const priceDisplay = isDiscounted ?
    `<p class="product-card__price">
     <span class="original-price">$${product.SuggestedRetailPrice.toFixed(2)}</span>
     $${product.FinalPrice.toFixed(2)}
     </p>
     ` : `<p class="product-card__price">$${product.FinalPrice.toFixed(2)}</p>`;


  // the link starts with "/" so it works from any page that lists products.
  return `<li class="product-card">
    <a href="/product_pages/?product=${product.Id}">
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
    // these are passed in to make the class as reusable as possible:
    // the same class can list any category, from any data source, into any element
    // the product category to list, for example "tents"
    this.category = category;
    // a ProductData instance used to get the products
    this.dataSource = dataSource;
    // the HTML element the product cards are rendered into
    this.listElement = listElement;
    // determines if an array is passed
    this.criteria = criteria 
  }

  async init() {
    let list = []
    // makes "list" to accept to types of values (arrays and promises)
    if (this.criteria === true){
      // assigns an array
      list = this.dataSource
    }else{
      // if dataSource returns a promise, use await to get the list of products
      // init is async so it can use await
      // the category tells the API which products to send back
      list = await this.dataSource.getData(this.category)
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
      a.NameWithoutBrand.localeCompare(b.NameWithoutBrand)
    );
  }

  if (option === "name-desc") {
    this.products.sort((a, b) =>
      b.NameWithoutBrand.localeCompare(a.NameWithoutBrand)
    );
   }

  this.renderList(this.products);
}

  // build a card for every product and put them all on the page
  renderList(list) {
    // the shared helper does the work: this class only supplies its own
    // template, its list element, and the products
    // "afterbegin" and true: insert at the start of the list and clear it first
    renderListWithTemplate(
      productCardTemplate,
      this.listElement,
      list,
      "afterbegin",
      true,
    );
  }
}

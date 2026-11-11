import { renderListWithTemplate } from './utils.mjs';

function productCardTemplate(product) {
    return `<li class="product-card">
          <a href="product_pages/?product=${product.Id}">
            <img src="${product.Image}" alt="${product.Name}" />
            <h3 class="card__brand">${product.Brand.Name}</h3>
            <h2 class="card__name">${product.NameWithoutBrand}</h2>
            <p class="product-card__price">$${product.FinalPrice}</p>
          </a>
        </li>`
}

export default class ProductList {

    constructor(category, dataSource, listElement) {
        // passed in this information to make the class as reusable as possible.
    // Being able to define these things when using the class will make it very flexible

        this.category = category;
        this.dataSource = dataSource;
        this.listElement = listElement;

    }

    async init() {

        // using await because the dataSource will return a Promise...

        const list = await this.dataSource.getData();

        // console.log(list);

        // render the list
        this.renderList(list);


    }

    renderList(productList) {

        renderListWithTemplate(
            productCardTemplate,
            this.listElement,
            productList
        );
    }

}
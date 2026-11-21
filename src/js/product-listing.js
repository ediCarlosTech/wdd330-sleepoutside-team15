
import ProductData from "./ProductData.mjs";
import ProductList from "./ProductList.mjs";
import {loadHeaderFooter, getParam } from './utils.mjs'

loadHeaderFooter();

const category = getParam('category');
const topProducts = document.querySelector(".products h2");

if (topProducts && category) {
    const formattedCategory = category.split("-").map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(" ");
    topProducts.textContent = `Top Products: ${formattedCategory}`;
}

// first create an instance of the ProductData class.

const dataSource = new ProductData();

// then get the element you want the product list to render in

const listElement = document.querySelector('.product-list');

// then create an instance of the ProductList class and send it the correct information.

const myList = new ProductList(category, dataSource, listElement);

// finally call the init method to show the products

myList.init();
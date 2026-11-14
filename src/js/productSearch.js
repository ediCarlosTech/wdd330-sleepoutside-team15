import { loadheaderfooter } from "./utils.mjs";
import ProductData from "./ProductData.mjs";
import ProductList from "./ProductList.mjs";

loadheaderfooter()

// Gets the document elements to render
const parentNode = document.querySelector(".product-list")
// search criteria 
const params = new URLSearchParams(window.location.search);
const searchTerm = params.get("search-product");
const keyword = document.querySelector("#keyword")


const productlist = await new ProductData("tents").getData()
// finds matches based on the criteria 
const matches = productlist.filter(product =>
    product.Name.toLowerCase().includes(searchTerm.toLowerCase())
);

// empty array handler
if (matches.length === 0){
    keyword.textContent = `${searchTerm} (Item not found)`
}else{
    keyword.textContent = searchTerm
    const resultList = new ProductList("tents", matches, parentNode, true)
    resultList.init()
}






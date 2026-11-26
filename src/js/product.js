import { loadheaderfooter, getParam, breadcrumb } from "./utils.mjs";
import ExternalServices from "./ExternalServices.mjs";
import ProductDetails from "./ProductDetails.mjs";
import Comments, {Comment} from "./comments.mjs";
// Header and footer loader (updates the cart count on the backpack icon)
loadheaderfooter();

breadcrumb();

// get the product ID from the URL
const productId = getParam("product");
// the data source that looks up the product in the API
const dataSource = new ExternalServices();
// create the product details for this page and render them
const product = new ProductDetails(productId, dataSource);

// comments section
const commentsContainer = document.getElementById("commentList");
const comments = new Comments(commentsContainer, productId);
comments.renderComments();

document.querySelector("#commentForm").addEventListener("submit", (event) => {
    event.preventDefault();
    const commentText = document.getElementById("commentText").value.trim();
    const commentUser = document.getElementById("commentUser").value.trim();
    if (!commentUser || !commentText) return;

    const newComment = new Comment(productId, commentUser, commentText);
    comments.saveComment(newComment);
    comments.renderComments();
    event.target.reset();
})

product.init();

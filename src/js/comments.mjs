import { getLocalStorage, renderListWithTemplate, setLocalStorage } from "./utils.mjs";

export class Comment {
    constructor(productID, user, text) {
        this.productID = productID;
        this.user = user;
        this.text = text;
        this.timestamp = new Date().toLocaleString("en-US");
    }
}

export default class Comments {
    constructor(listElement, productID) {
        this.productID = productID;
        this.listElement = listElement;
        this.storageKey = "so-comments";
        this.comments = [];
    }

    getComments() {
        this.allComments = getLocalStorage(this.storageKey) || {};
        this.comments = this.allComments[this.productID] || [];
        return this.comments;
    };


    saveComment(comment) {
        this.allComments = getLocalStorage(this.storageKey) || {};
        this.comments = this.allComments[this.productID] || [];
        this.comments.push(comment);
        this.allComments[this.productID] = this.comments;
        setLocalStorage(this.storageKey, this.allComments);
    }

    displayComment(comment) {
        return `<li class="comment-area">
            <span class="comment-user">${comment.user}
            </span> <span class="comment-time">${comment.timestamp}</span>
            <p class="comment-text">${comment.text}</p>
        </li>`
    }
    
    renderComments(comments = this.getComments()) {
        renderListWithTemplate(this.displayComment, this.listElement, comments, "afterbegin", true)
    }




}
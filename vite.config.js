import { resolve } from "path";
import { defineConfig } from "vite";

export default defineConfig({
  root: "src/",

  build: {
    outDir: "../dist",
    rollupOptions: {
      input: {
        main: resolve(__dirname, "src/index.html"),
        cart: resolve(__dirname, "src/cart/index.html"),
        // the single product page, filled in from the "?product=" URL parameter
        product: resolve(__dirname, "src/product_pages/index.html"),
        productSearch: resolve(__dirname, "src/productSearch.html"),
        // the product listing page, filled in from the "?category=" URL parameter
        productListing: resolve(__dirname, "src/product_listing/index.html"),
        // wishlist page
        wishlist: resolve(__dirname, "src/wishlist/index.html"),
        // checkout page
        checkout: resolve(__dirname, "src/checkout/index.html"),
        // the page shown after an order is placed
        success: resolve(__dirname, "src/checkout/success.html"),
      },
    },
  },
});

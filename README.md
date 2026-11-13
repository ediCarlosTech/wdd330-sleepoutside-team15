# BYU-Pathway Worldwide Online

## WDD 330 - Web Frontend Development II

### ⛺ SleepOutside Starter Code

- This repository is the start of the SleepOutside web application project for WDD 330. The repository contains branches which are checkpoints for the team and individual assignments throughout the course.

- <https://byui-cse.github.io/wdd330-ww-course/week01/team.html>

### Prerequisites

- You must have Node installed to run the following commands.
  [WDD 330 Setup Environment](https://byui-cse.github.io/wdd330-ww-course/intro/)

### Common Workflow Commands

- `npm run lint` to run ESLint against your code to find errors.
- `npm run format` to run Prettier to automatically format your code.
- `npm run start` starts up a local server and updates on any JS or CSS/SCSS
- `npm run build` to build final files when you are ready to turn in.

### Team 15

- Edi Carlos da Silva
- Bryon Chase
- Timothy Antonio Whitehead
- Esteban Ruben Mangas Calva
- Jose Alberto Brito Santana
- Yoel Campos Porras

### Updates

#### Week 2: Dynamic Product Detail Page

- **One product page for every product:** `product_pages/index.html` replaces the separate HTML file for each tent. It reads the product ID from the URL (for example `product_pages/?product=880RR`) and fills in the brand, name, image, price, color, and description from `json/tents.json`. A product ID that does not exist shows a "product could not be found" message.
- **Home page links:** The product links on the home page now use the `?product=` URL parameter with each tent's ID (`880RR`, `985RF`, `985PR`, `344YJ`).
- **`ProductDetails` class:** The new `js/ProductDetails.mjs` module holds the product page logic:
  - `init()` loads the product with `ProductData`, renders it, and sets up the "Add to Cart" button.
  - `renderProductDetails()` fills in the page HTML.
  - `addProductToCart()` was moved to ProductDetails from `product.js` and keeps the prior cart quantity rules.
- **`getParam(param)`:** A new helper in `js/utils.mjs` that returns a value from the URL query string.
- **`utils.mjs` exports:** All of the module's exports are now listed in one `export { ... }` block at the bottom of the file. Add new helpers to that list so other modules can import them.
- **`product.js`:** Now only sets up the page: it gets the product ID, creates `ProductData` and `ProductDetails`, and calls `init()`.
- **Build:** `vite.config.js` includes `product_pages/index.html` so `npm run build` outputs the new page. 
- The four old tent pages (`cedar-ridge-rimrock-2.html`, `marmot-ajax-3.html`, `northface-alpine-3.html`, `northface-talus-4.html`) have been deleted. `product_pages/index.html` is the only product page.

#### Week 2: Product List

- **Build fixes:**
  - `vite.config.js` now builds only the pages in use: home, cart, checkout, and `product_pages/index.html`.
  - `json/` and `images/` moved into `src/public/`, so Vite copies them into the build.
  - Image paths now start with `/images/` so they work from any page.
  - The checkout page now loads `/css/style.css`.
- **Home page list:** The home page product cards are now built from `json/tents.json` instead of being typed into `index.html`.
- **`main.js`:** Creates `ProductData` and `ProductList` for tents and calls `init()`. The home page loads it with a `<script type="module">` tag.
- **`ProductList` class:** The new `js/ProductList.mjs` module gets the products and renders a card for each one using the `productCardTemplate(product)` function.
- **`renderListWithTemplate()`:** A new helper in `js/utils.mjs` that renders any list with any template function. It can insert at a chosen position (`"afterbegin"` by default) and clear the element first (`false` by default).
- **Missing tent images added:** The North Face Talus 3-Person (`989CG`) and Marmot Ajax 2-Person (`880RT`) now have 320 × 320 `.webp` images, and their `Image` paths in `tents.json` point to them.

#### Shopping Cart

- **Multiple items in the cart:** The cart is now saved as an array in local storage (`so-cart`), so adding a new product no longer replaces what is already in the cart. Older carts saved as a single object are converted to an array automatically.
- **Quantity instead of duplicates:** Adding a product that is already in the cart increases its quantity instead of adding a second copy of the item.
- **Quantity limit:** Each product is limited to a maximum quantity of 99.
- **Talus tent product ID:** The "Add to Cart" button on the North Face Talus 4-Person page used the 3-Person tent's ID (`989CG`), which has no image, so the cart showed a broken image. It now uses the correct ID (`985RF`).
- **Cart display:** The cart page shows the actual quantity of each item, and the price shows the line total (price × quantity) formatted to two decimal places.
- **Change quantity in the cart:** Each item has "-" and "+" buttons next to its quantity. "+" adds one (up to the 99 limit), and "-" removes one. Pressing "-" when the quantity is 1 removes the item from the cart.
- **Remove an item:** An "X" in the top-right corner of each item removes it from the cart.
- **Cart total:** The total cost of everything in the cart (price × quantity for each item) shows at the bottom of the cart. It is inside a `cart-footer` element that is hidden with the `hide` class when the cart is empty. The Checkout button will be added to this footer later.
- **Empty cart:** The cart page no longer breaks when nothing has been added yet. It shows "Your cart is empty." instead.
- Each "X", "-", and "+" button stores the product ID (`data-id`) and what it does (`data-action`). One click listener on the cart list handles all of them, because the cart HTML is rebuilt after every change.

#### Code Style

- ESLint now enforces double quotes (`"quotes": ["error", "double"]`) to match the Prettier formatting used in the project.

> **Note:** If your cart still shows duplicate items from before these updates, clear the saved cart by running `localStorage.removeItem("so-cart")` in the browser console.

---

_BYU-Pathway Worldwide improves lives through access to spiritually based, online affordable higher education. Its mission is to develop disciples of Jesus Christ who are leaders in their homes, the Church, and their communities._

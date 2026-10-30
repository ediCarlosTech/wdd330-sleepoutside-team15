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

### Updates

#### Shopping Cart

- **Multiple items in the cart:** The cart is now saved as an array in local storage (`so-cart`), so adding a new product no longer replaces what is already in the cart. Older carts saved as a single object are converted to an array automatically.
- **Quantity instead of duplicates:** Adding a product that is already in the cart increases its quantity instead of adding a second copy of the item.
- **Quantity limit:** Each product is limited to a maximum quantity of 99.
- **Cart display:** The cart page shows the actual quantity of each item, and the price shows the line total (price × quantity) formatted to two decimal places.

#### Code Style

- ESLint now enforces double quotes (`"quotes": ["error", "double"]`) to match the Prettier formatting used in the project.

> **Note:** If your cart still shows duplicate items from before these updates, clear the saved cart by running `localStorage.removeItem("so-cart")` in the browser console.

---
_BYU-Pathway Worldwide improves lives through access to spiritually based, online affordable higher education. Its mission is to develop disciples of Jesus Christ who are leaders in their homes, the Church, and their communities._

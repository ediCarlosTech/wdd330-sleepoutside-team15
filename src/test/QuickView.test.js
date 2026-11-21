/**
 * @jest-environment jsdom
 */
import QuickView from "../js/QuickView.mjs";
import { addToCart } from "../js/cartUtils.mjs";

// the cart code is tested elsewhere; here it only needs to be called
jest.mock("../js/cartUtils.mjs", () => ({ addToCart: jest.fn() }));

const product = {
  Id: "223RN",
  Name: "Gregory Zulu 55 Backpack - Internal Frame",
  NameWithoutBrand: "Zulu 55 Backpack - Internal Frame",
  Brand: { Name: "Gregory" },
  Images: { PrimaryLarge: "large.jpg", PrimaryMedium: "medium.jpg" },
  Colors: [{ ColorName: "Moss Green" }],
  DescriptionHtmlSimple: "<strong>Closeouts</strong>. A roomy pack.",
  FinalPrice: 129.99,
};

function setupPage() {
  document.body.innerHTML = `
    <button id="opener">Quick View</button>
    <div id="quick-view-modal" class="modal hidden">
      <div class="modal-content">
        <button id="close-modal" type="button">&times;</button>
        <img id="quick-view-image" src="" alt="" />
        <h3 id="quick-view-brand"></h3>
        <h2 id="quick-view-name"></h2>
        <p id="quick-view-price"></p>
        <p id="quick-view-color"></p>
        <div id="quick-view-description"></div>
        <button id="quick-view-add" type="button">Add to Cart</button>
        <p id="quick-view-status" role="status"></p>
      </div>
    </div>`;

  return {
    modal: document.querySelector("#quick-view-modal"),
    opener: document.querySelector("#opener"),
    closeButton: document.querySelector("#close-modal"),
    addButton: document.querySelector("#quick-view-add"),
  };
}

function press(key, options = {}) {
  const event = new KeyboardEvent("keydown", {
    key,
    bubbles: true,
    cancelable: true,
    ...options,
  });
  document.dispatchEvent(event);
  return event;
}

let page;
let dataSource;
let quickView;

beforeEach(() => {
  addToCart.mockClear();
  page = setupPage();
  dataSource = { findProductById: jest.fn().mockResolvedValue(product) };
  quickView = new QuickView(page.modal, dataSource);
  quickView.init();
});

describe("opening", () => {
  test("fills in the product, shows the pop-up, and focuses the close button", async () => {
    await quickView.open("223RN", page.opener);

    expect(dataSource.findProductById).toHaveBeenCalledWith("223RN");
    expect(page.modal.classList.contains("hidden")).toBe(false);
    expect(document.querySelector("#quick-view-name").textContent).toBe(
      product.NameWithoutBrand,
    );
    expect(document.querySelector("#quick-view-brand").textContent).toBe(
      "Gregory",
    );
    expect(document.querySelector("#quick-view-price").textContent).toBe(
      "$129.99",
    );
    expect(document.querySelector("#quick-view-color").textContent).toBe(
      "Color: Moss Green",
    );
    expect(document.querySelector("#quick-view-image").src).toContain(
      "large.jpg",
    );
    expect(
      document.querySelector("#quick-view-description").innerHTML,
    ).toContain("<strong>Closeouts</strong>");
    expect(document.activeElement).toBe(page.closeButton);
  });

  test("does not read API text as HTML (name is set with textContent)", async () => {
    dataSource.findProductById.mockResolvedValue({
      ...product,
      NameWithoutBrand: "<img src=x onerror=alert(1)>",
    });
    await quickView.open("223RN");

    const name = document.querySelector("#quick-view-name");
    expect(name.querySelector("img")).toBeNull();
    expect(name.textContent).toBe("<img src=x onerror=alert(1)>");
  });

  test("copes with a product that has no color or large image", async () => {
    dataSource.findProductById.mockResolvedValue({
      ...product,
      Colors: [],
      Images: { PrimaryMedium: "medium.jpg" },
    });
    await quickView.open("223RN");

    expect(document.querySelector("#quick-view-color").textContent).toBe("");
    expect(document.querySelector("#quick-view-image").src).toContain(
      "medium.jpg",
    );
  });

  test("shows a friendly message and disables Add to Cart for an unknown ID", async () => {
    dataSource.findProductById.mockResolvedValue(null);
    await quickView.open("NOPE");

    expect(page.modal.classList.contains("hidden")).toBe(false);
    expect(document.querySelector("#quick-view-name").textContent).toMatch(
      /could not load/i,
    );
    expect(page.addButton.disabled).toBe(true);
  });

  test("shows the same message when the request fails", async () => {
    dataSource.findProductById.mockRejectedValue(new Error("network down"));
    await quickView.open("223RN");

    expect(document.querySelector("#quick-view-name").textContent).toMatch(
      /could not load/i,
    );
    expect(page.addButton.disabled).toBe(true);
  });

  test("re-enables Add to Cart after an error when a good product opens", async () => {
    dataSource.findProductById.mockResolvedValueOnce(null);
    await quickView.open("NOPE");
    await quickView.open("223RN");

    expect(page.addButton.disabled).toBe(false);
  });
});

describe("adding to the cart", () => {
  test("adds the product and announces it", async () => {
    await quickView.open("223RN", page.opener);
    page.addButton.click();

    expect(addToCart).toHaveBeenCalledTimes(1);
    expect(addToCart).toHaveBeenCalledWith(product);
    expect(document.querySelector("#quick-view-status").textContent).toBe(
      "Zulu 55 Backpack - Internal Frame was added to your cart.",
    );
  });

  test("does nothing when no product is loaded", async () => {
    dataSource.findProductById.mockResolvedValue(null);
    await quickView.open("NOPE");
    quickView.addProductToCart();

    expect(addToCart).not.toHaveBeenCalled();
  });

  test("clears the old message when another product opens", async () => {
    await quickView.open("223RN");
    page.addButton.click();
    await quickView.open("223RN");

    expect(document.querySelector("#quick-view-status").textContent).toBe("");
  });
});

describe("closing", () => {
  test("the close button closes it and returns focus to the opener", async () => {
    await quickView.open("223RN", page.opener);
    page.closeButton.click();

    expect(page.modal.classList.contains("hidden")).toBe(true);
    expect(document.activeElement).toBe(page.opener);
  });

  test("Escape closes it", async () => {
    await quickView.open("223RN", page.opener);
    press("Escape");

    expect(page.modal.classList.contains("hidden")).toBe(true);
  });

  test("a click on the backdrop closes it, a click inside does not", async () => {
    await quickView.open("223RN", page.opener);

    document.querySelector(".modal-content").click();
    expect(page.modal.classList.contains("hidden")).toBe(false);

    page.modal.click();
    expect(page.modal.classList.contains("hidden")).toBe(true);
  });

  test("Escape does nothing while closed (focus is not stolen)", () => {
    page.opener.focus();
    press("Escape");

    expect(document.activeElement).toBe(page.opener);
  });
});

describe("focus trap", () => {
  test("Tab on the last control wraps to the first", async () => {
    await quickView.open("223RN", page.opener);
    page.addButton.focus();

    const event = press("Tab");

    expect(event.defaultPrevented).toBe(true);
    expect(document.activeElement).toBe(page.closeButton);
  });

  test("Shift+Tab on the first control wraps to the last", async () => {
    await quickView.open("223RN", page.opener);
    page.closeButton.focus();

    const event = press("Tab", { shiftKey: true });

    expect(event.defaultPrevented).toBe(true);
    expect(document.activeElement).toBe(page.addButton);
  });

  test("Tab in the middle is left alone", async () => {
    await quickView.open("223RN", page.opener);
    page.closeButton.focus();

    const event = press("Tab");

    expect(event.defaultPrevented).toBe(false);
  });

  test("with Add to Cart disabled, the close button is the only stop", async () => {
    dataSource.findProductById.mockResolvedValue(null);
    await quickView.open("NOPE", page.opener);

    const event = press("Tab");

    expect(event.defaultPrevented).toBe(true);
    expect(document.activeElement).toBe(page.closeButton);
  });
});

// the API server address, from "VITE_SERVER_URL" in the ".env" file
const baseURL = import.meta.env.VITE_SERVER_URL;

function convertToJson(res) {
  if (res.ok) {
    return res.json();
  } else {
    throw new Error("Bad Response");
  }
}

export default class ProductData {
  // category is passed in to getData()
  // so the same data source can be used for any category
  constructor() {}

  // get all products in a category
  async getData(category) {
    const response = await fetch(`${baseURL}products/search/${category}`);
    const data = await convertToJson(response);
    // the API puts the list of products in "Result"
    return data.Result;
  }

  // get one product by its ID straight from the API
  async findProductById(id) {
    const response = await fetch(`${baseURL}product/${id}`);
    // the API answers with an error (400) when the ID does not match a product:
    // Id not found return null so the product page can show "not found" message
    if (!response.ok) {
      return null;
    }
    const data = await convertToJson(response);
    // the API puts the product in "Result"
    return data.Result;
  }
}

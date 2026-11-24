// the API server address, from "VITE_SERVER_URL" in the ".env" file
const baseURL = import.meta.env.VITE_SERVER_URL;
// console.log(baseURL)

function convertToJson(res) {
  if (res.ok) {
    return res.json();
  } else {
    throw new Error("Bad Response");
  }
}

export default class ProductData {
  // so the same data source can be used for any category
  constructor() {}
  // get all products in a category
  async getData(category) {
    const response = await fetch(`${baseURL}products/search/${category} `);
    const data = await convertToJson(response);
    // the API saves tha data in Result
    // console.log(data.Result)
    return data.Result;
  }

  // get one product by its ID straight from the API
  // the API answers with an error (400) when the ID does not match a product:
  // Id not found return null so the product page can show "not found" message

// TODO make the serch produt feature search by ID.
  async findProductById(id) {
    const response = await fetch(`${baseURL}product/${id}`);
    if (!response.ok) {
      return null;
    }
    const data = await convertToJson(response);
    // the API puts the product in "Result"
    return data.Result;
  }
}

// the API server address, from "VITE_SERVER_URL" in the ".env" file
const baseURL = import.meta.env.VITE_SERVER_URL;

async function convertToJson(res) {

  const jsonResponse = await res.json();

  if (res.ok) {
    return jsonResponse;
  } 

  throw {
    name: "servicesError",
    message: jsonResponse
  };
  
}

export default class ExternalServices {
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

  async checkout(order) {

    const url = "https://wdd330-backend-osp8.onrender.com/checkout";

    const options = {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(order)
    };

    const response = await fetch(url, options);

    return await response.json();
  }

}

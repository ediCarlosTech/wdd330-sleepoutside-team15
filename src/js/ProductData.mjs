const baseURL  = import.meta.env.VITE_SERVER_URL;

function convertToJson(res) {
  if (res.ok) {
    return res.json();
  } else {
    throw new Error("Bad Response");
  }
}

export default class ProductData {
  constructor() {
    this.baseURL = baseURL;
  }
  
  getData(category) {
    return fetch(`${baseURL}products/search/${category} `)
      .then(convertToJson)
      .then((data) => data);
  }
  async findProductById(id) {
    const url = `${this.baseURL}product/${id}`;
    const response = await fetch(url);
    const data = await convertToJson(response);
    return data.Result;
  }
}

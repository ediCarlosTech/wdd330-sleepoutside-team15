const GIPHY_URL = "https://api.giphy.com/v1/gifs/search";

// answers by search text, so the same reaction is not fetched twice
const cache = new Map();

async function loadGif(query, apiKey) {
  const params = new URLSearchParams({
    api_key: apiKey,
    q: query,
    limit: "1",
    rating: "g",
  });
  const response = await fetch(`${GIPHY_URL}?${params}`);
  if (!response.ok) {
    throw new Error(`GIF request failed with status ${response.status}`);
  }

  const { data } = await response.json();
  const gif = data?.[0];
  const url = gif?.images?.fixed_height?.url;
  if (!url) {
    return null;
  }
  return {
    title: gif.title || "",
    url,
    // a still frame for people who prefer reduced motion
    stillUrl: gif.images.fixed_height_still?.url || url,
    link: gif.url || "",
  };
}

// Returns { title, url, stillUrl, link } or null when there is no key or no match.
// apiKey comes from main.js so this module stays easy to test.
export function searchGif(query, apiKey) {
  if (!apiKey) {
    return Promise.resolve(null);
  }

  if (!cache.has(query)) {
    cache.set(
      query,
      loadGif(query, apiKey).catch((err) => {
        cache.delete(query);
        throw err;
      }),
    );
  }
  return cache.get(query);
}

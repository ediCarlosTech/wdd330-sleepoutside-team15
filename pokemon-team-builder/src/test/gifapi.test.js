import { searchGif } from "../js/gifapi.js";

const ok = (data) => ({ ok: true, json: async () => ({ data }) });

const giphyResult = {
  title: "pikachu happy GIF",
  url: "https://giphy.com/gifs/abc",
  images: {
    fixed_height: { url: "https://media.giphy.com/a.gif" },
    fixed_height_still: { url: "https://media.giphy.com/a_s.gif" },
  },
};

beforeEach(() => {
  global.fetch = jest.fn();
});

test("without a key it returns null and makes no request", async () => {
  await expect(searchGif("pikachu pokemon", "")).resolves.toBeNull();
  expect(global.fetch).not.toHaveBeenCalled();
});

test("maps the first result and asks for family-friendly GIFs", async () => {
  global.fetch.mockResolvedValueOnce(ok([giphyResult]));

  await expect(searchGif("pikachu pokemon", "key")).resolves.toEqual({
    title: "pikachu happy GIF",
    url: "https://media.giphy.com/a.gif",
    stillUrl: "https://media.giphy.com/a_s.gif",
    link: "https://giphy.com/gifs/abc",
  });

  const requested = global.fetch.mock.calls[0][0];
  expect(requested).toContain("rating=g");
  expect(requested).toContain("limit=1");
});

test("the same search is only fetched once", async () => {
  global.fetch.mockResolvedValueOnce(ok([giphyResult]));

  await searchGif("eevee pokemon", "key");
  await searchGif("eevee pokemon", "key");
  expect(global.fetch).toHaveBeenCalledTimes(1);
});

test("no results gives null", async () => {
  global.fetch.mockResolvedValueOnce(ok([]));
  await expect(searchGif("zzzz pokemon", "key")).resolves.toBeNull();
});

test("a failed request throws and is not cached", async () => {
  global.fetch
    .mockResolvedValueOnce({ ok: false, status: 429 })
    .mockResolvedValueOnce(ok([giphyResult]));

  await expect(searchGif("mew pokemon", "key")).rejects.toThrow("status 429");
  await expect(searchGif("mew pokemon", "key")).resolves.toMatchObject({
    url: "https://media.giphy.com/a.gif",
  });
});

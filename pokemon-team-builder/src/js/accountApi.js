// Talks to the account server. Every function resolves to
//   { ok: true, data }  or  { ok: false, status, error }
// and never throws, so callers only need to check `ok`.
// The browser sends the login cookie by itself; this code never sees it.

const NETWORK_ERROR =
  "We couldn't reach the server. Check your connection and try again.";
const UNAVAILABLE_ERROR = "Accounts aren't available right now.";

async function request(method, path, body) {
  let response;
  try {
    response = await fetch(`/api${path}`, {
      method,
      // the server only accepts JSON for changes, which blocks cross-site forms
      headers: method === "GET" ? {} : { "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch (err) {
    return { ok: false, status: 0, error: NETWORK_ERROR };
  }

  let data = null;
  if (response.status !== 204) {
    try {
      data = await response.json();
    } catch (err) {
      // a page that is not JSON means there is no account server behind /api
      return { ok: false, status: response.status, error: UNAVAILABLE_ERROR };
    }
  }

  if (!response.ok) {
    return {
      ok: false,
      status: response.status,
      error: data?.error ?? "Something went wrong. Try again.",
    };
  }
  return { ok: true, data };
}

export const getSession = () => request("GET", "/auth/me");
export const register = (username, password) =>
  request("POST", "/auth/register", { username, password });
export const login = (username, password) =>
  request("POST", "/auth/login", { username, password });
export const logout = () => request("POST", "/auth/logout", {});
export const deleteAccount = (password) =>
  request("DELETE", "/account", { password });

export const listOwned = () => request("GET", "/owned");
export const addOwned = (body) => request("POST", "/owned", body);
export const updateOwned = (id, body) => request("PUT", `/owned/${id}`, body);
export const deleteOwned = (id) => request("DELETE", `/owned/${id}`);

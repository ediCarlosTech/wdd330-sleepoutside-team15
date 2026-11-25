import { bestBySpecies } from "./owned.js";

const SESSION_ENDED = "Your session ended. Log in again to continue.";

// Who is signed in and which Pokémon they own. Pages listen with onChange()
// and redraw. Every action returns { ok: true } or { ok: false, error }
// so the caller can show the message.
export default class Account {
  // accountApi: the functions from accountApi.js
  constructor(accountApi) {
    this.api = accountApi;
    this.user = null;
    this.owned = [];
    // false until the check for an old login has finished, so pages can wait
    this.ready = false;
    // set when the owned list could not be loaded, so the page can say so
    this.loadError = "";
    // Google's public OAuth client ID, or null when Google sign-in is off
    this.googleClientId = null;
    this.listeners = [];
    this.best = new Map();
  }

  get isLoggedIn() {
    return this.user !== null;
  }

  // species -> best owned Pokémon of that species
  bestBySpecies() {
    return this.best;
  }

  // listener(change) with change "session" (login/logout) or "owned"
  onChange(listener) {
    this.listeners.push(listener);
  }

  notify(change) {
    this.best = bestBySpecies(this.owned);
    this.listeners.forEach((listener) => listener(change));
  }

  // restores a session left by an earlier visit
  async init() {
    const [session, config] = await Promise.all([
      this.api.getSession(),
      this.api.getConfig(),
    ]);
    this.googleClientId = config.ok
      ? (config.data.googleClientId ?? null)
      : null;
    if (session.ok && session.data.user) {
      this.user = session.data.user;
      await this.loadOwned();
    }
    this.ready = true;
    this.notify("session");
  }

  async loadOwned() {
    const result = await this.api.listOwned();
    if (result.ok) {
      this.owned = result.data.owned;
      this.loadError = "";
    } else {
      this.loadError = result.error;
    }
    return result.ok;
  }

  async reloadOwned() {
    await this.loadOwned();
    this.notify("owned");
  }

  async signIn(action, username, password) {
    const result = await this.api[action](username, password);
    if (!result.ok) {
      return { ok: false, error: result.error };
    }
    this.user = result.data.user;
    this.owned = [];
    await this.loadOwned();
    this.notify("session");
    return { ok: true };
  }

  login(username, password) {
    return this.signIn("login", username, password);
  }

  register(username, password) {
    return this.signIn("register", username, password);
  }

  // What Google hands back after the person signs in. While logged in it
  // connects that Google account to this one; otherwise it logs in, or
  // creates an account the first time.
  async googleCredential(credential) {
    const linking = this.isLoggedIn;
    const result = await this.api.googleSignIn(credential, linking);
    if (!result.ok) {
      return linking ? this.failed(result) : { ok: false, error: result.error };
    }
    this.user = result.data.user;
    if (!linking) {
      this.owned = [];
      await this.loadOwned();
    }
    this.notify("session");
    return {
      ok: true,
      linked: linking,
      created: !linking && result.status === 201,
    };
  }

  clear() {
    this.user = null;
    this.owned = [];
    this.loadError = "";
    this.notify("session");
  }

  async logout() {
    const result = await this.api.logout();
    if (!result.ok) {
      // still signed in on the server, so do not pretend otherwise
      return { ok: false, error: result.error };
    }
    this.clear();
    return { ok: true };
  }

  // `typed` is the password, or for a Google-only account the username
  async deleteAccount(typed) {
    const proof =
      this.user?.hasPassword === false
        ? { confirm: typed }
        : { password: typed };
    const result = await this.api.deleteAccount(proof);
    if (!result.ok) {
      return { ok: false, error: result.error };
    }
    this.clear();
    return { ok: true };
  }

  // an expired login shows up as 401 on any owned request
  failed(result) {
    if (result.status === 401 && this.user) {
      this.clear();
      return { ok: false, error: SESSION_ENDED };
    }
    return { ok: false, error: result.error };
  }

  // adds a new Pokémon, or updates one when `id` is given
  async save(body, id = null) {
    const result =
      id === null
        ? await this.api.addOwned(body)
        : await this.api.updateOwned(id, body);
    if (!result.ok) {
      return this.failed(result);
    }

    const saved = result.data.owned;
    this.owned =
      id === null
        ? [saved, ...this.owned]
        : this.owned.map((entry) => (entry.id === id ? saved : entry));
    this.notify("owned");
    return { ok: true, owned: saved };
  }

  async remove(id) {
    const result = await this.api.deleteOwned(id);
    if (!result.ok) {
      return this.failed(result);
    }
    this.owned = this.owned.filter((entry) => entry.id !== id);
    this.notify("owned");
    return { ok: true };
  }
}

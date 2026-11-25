// The header's login controls plus the login/create-account and
// delete-account pop-ups. All the real work happens in Account.

const MESSAGE_SECONDS = 6;

const MODES = {
  login: {
    title: "Log in",
    intro:
      "Log in to track the Pokémon you own and get team picks based on them.",
    submit: "Log in",
    toggleText: "New here? Create an account",
    autocomplete: "current-password",
  },
  register: {
    title: "Create an account",
    intro:
      "An account keeps your owned Pokémon safe so you can use them on any device.",
    submit: "Create account",
    toggleText: "Already have an account? Log in",
    autocomplete: "new-password",
  },
};

export default class AuthView {
  // account: the Account instance
  constructor({ account }) {
    this.account = account;
    this.mode = "login";
    this.busy = false;

    this.loginButton = document.querySelector("#login-button");
    this.logoutButton = document.querySelector("#logout-button");
    this.nameLabel = document.querySelector("#account-name");
    this.message = document.querySelector("#site-message");

    this.dialog = document.querySelector("#auth-dialog");
    this.form = document.querySelector("#auth-form");
    this.title = document.querySelector("#auth-title");
    this.intro = document.querySelector("#auth-intro");
    this.username = document.querySelector("#auth-username");
    this.password = document.querySelector("#auth-password");
    this.hint = document.querySelector("#auth-hint");
    this.error = document.querySelector("#auth-error");
    this.submitButton = document.querySelector("#auth-submit");
    this.toggle = document.querySelector("#auth-toggle");

    this.deleteDialog = document.querySelector("#delete-dialog");
    this.deleteForm = document.querySelector("#delete-form");
    this.deletePassword = document.querySelector("#delete-password");
    this.deleteError = document.querySelector("#delete-error");
    this.deleteButton = document.querySelector("#delete-submit");

    this.messageTimer = null;
  }

  init() {
    this.loginButton.addEventListener("click", () => this.open("login"));
    this.logoutButton.addEventListener("click", () => this.logout());
    this.toggle.addEventListener("click", () =>
      this.setMode(this.mode === "login" ? "register" : "login"),
    );
    this.form.addEventListener("submit", (event) => this.submit(event));
    this.deleteForm.addEventListener("submit", (event) =>
      this.submitDelete(event),
    );
    // a click on the dark backdrop lands on the <dialog> itself
    [this.dialog, this.deleteDialog].forEach((dialog) => {
      dialog.addEventListener("click", (event) => {
        if (event.target === dialog) {
          dialog.close();
        }
      });
    });
    this.account.onChange(() => this.renderBar());
    this.renderBar();
  }

  // the header shows Log in, or the name and Log out
  renderBar() {
    const { isLoggedIn, user } = this.account;
    this.loginButton.classList.toggle("hide", isLoggedIn);
    this.logoutButton.classList.toggle("hide", !isLoggedIn);
    this.nameLabel.classList.toggle("hide", !isLoggedIn);
    this.nameLabel.textContent = isLoggedIn ? `Hi, ${user.username}` : "";
  }

  // a short note under the header, for results of actions that close a pop-up
  say(text, isError = false) {
    clearTimeout(this.messageTimer);
    this.message.textContent = text;
    this.message.classList.toggle("site-message--error", isError);
    this.message.classList.remove("hide");
    this.messageTimer = setTimeout(
      () => this.message.classList.add("hide"),
      MESSAGE_SECONDS * 1000,
    );
  }

  setMode(mode) {
    const settings = MODES[mode];
    this.mode = mode;
    this.title.textContent = settings.title;
    this.intro.textContent = settings.intro;
    this.submitButton.textContent = settings.submit;
    this.toggle.textContent = settings.toggleText;
    this.password.autocomplete = settings.autocomplete;
    this.hint.classList.toggle("hide", mode === "login");
    // creating an account has rules; logging in must not block an older password
    this.password.minLength = mode === "register" ? 8 : 0;
    this.username.pattern = mode === "register" ? "[A-Za-z0-9_]{3,30}" : ".*";
    this.error.textContent = "";
  }

  open(mode = "login") {
    this.form.reset();
    this.setMode(mode);
    if (!this.dialog.open) {
      this.dialog.showModal();
    }
    this.username.focus();
  }

  async submit(event) {
    event.preventDefault();
    if (this.busy) {
      return;
    }
    this.busy = true;
    this.submitButton.disabled = true;
    this.error.textContent = "";

    const action = this.mode === "register" ? "register" : "login";
    const result = await this.account[action](
      this.username.value.trim(),
      this.password.value,
    );

    this.busy = false;
    this.submitButton.disabled = false;

    if (!result.ok) {
      this.error.textContent = result.error;
      // keep the name, clear the password, and let them try again
      this.password.value = "";
      this.password.focus();
      return;
    }

    this.form.reset();
    this.dialog.close();
    this.say(
      this.mode === "register"
        ? `Welcome, ${this.account.user.username}! Your account is ready.`
        : `Logged in as ${this.account.user.username}.`,
    );
    // the Log in button just disappeared, so give focus a new home
    this.nameLabel.focus();
  }

  async logout() {
    this.logoutButton.disabled = true;
    const result = await this.account.logout();
    this.logoutButton.disabled = false;

    if (!result.ok) {
      this.say(result.error, true);
      return;
    }
    this.say("Logged out.");
    this.loginButton.focus();
  }

  openDelete() {
    this.deleteForm.reset();
    this.deleteError.textContent = "";
    this.deleteDialog.showModal();
    this.deletePassword.focus();
  }

  async submitDelete(event) {
    event.preventDefault();
    if (this.busy) {
      return;
    }
    this.busy = true;
    this.deleteButton.disabled = true;
    this.deleteError.textContent = "";

    const result = await this.account.deleteAccount(this.deletePassword.value);

    this.busy = false;
    this.deleteButton.disabled = false;

    if (!result.ok) {
      this.deleteError.textContent = result.error;
      this.deletePassword.value = "";
      this.deletePassword.focus();
      return;
    }
    this.deleteForm.reset();
    this.deleteDialog.close();
    this.say("Your account and its Pokémon were deleted.");
    this.loginButton.focus();
  }
}

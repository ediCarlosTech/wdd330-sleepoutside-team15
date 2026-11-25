// Loads Google's sign-in script only when it is needed, and draws Google's
// own button. Nothing here runs unless the server says Google sign-in is on,
// so people who never use it never contact Google.

const SCRIPT_URL = "https://accounts.google.com/gsi/client";

let loading = null;
let configuredFor = "";
// Google calls one function for every button, so it hands off to this one
let handleCredential = () => {};

function loadScript() {
  if (window.google?.accounts?.id) {
    return Promise.resolve();
  }
  if (!loading) {
    loading = new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = SCRIPT_URL;
      script.async = true;
      script.addEventListener("load", resolve);
      script.addEventListener("error", () => {
        // allow another try later, for example after the connection returns
        loading = null;
        script.remove();
        reject(new Error("Google's sign-in script could not load."));
      });
      document.head.append(script);
    });
  }
  return loading;
}

// Draws Google's button inside `container`.
// onCredential(token) runs when the person finishes signing in with Google.
// Resolves to true, or false when Google's script could not be loaded.
export async function renderGoogleButton(container, clientId, onCredential) {
  try {
    await loadScript();
  } catch (err) {
    return false;
  }
  handleCredential = onCredential;

  if (configuredFor !== clientId) {
    window.google.accounts.id.initialize({
      client_id: clientId,
      callback: (response) => handleCredential(response.credential),
      // sign-in only happens when the person presses the button
      auto_select: false,
      ux_mode: "popup",
    });
    configuredFor = clientId;
  }

  container.replaceChildren();
  window.google.accounts.id.renderButton(container, {
    type: "standard",
    theme: "outline",
    size: "large",
    text: "continue_with",
    shape: "rectangular",
    width: 280,
  });
  return true;
}

/**
 * @jest-environment jsdom
 */
import Alert from "../js/Alert.js";

jest.mock("../json/alerts.json", () => ({
  __esModule: true,
  default: [{ message: "Test alert", background: "darkblue", color: "white" }],
}), { virtual: true });

test("prepends the alert section to main", async () => {
  document.body.innerHTML = "<main><div id='existing'></div></main>";

  const alert = new Alert();
  await alert.loadAlerts();

  const main = document.querySelector("main");
  expect(main.firstElementChild.classList.contains("alert-list")).toBe(true);
  expect(main.querySelector(".alert-list p").textContent).toBe("Test alert");
});
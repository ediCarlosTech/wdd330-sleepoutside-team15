export default class Alert {
  constructor() {
    this.loadAlerts();
  }

  async loadAlerts() {
    const alertModule = await import("../json/alerts.json");
    const alerts = alertModule.default ?? alertModule.alerts ?? [];

    if (!Array.isArray(alerts) || alerts.length === 0) return;

    const alertList = document.createElement("section");
    alertList.classList.add("alert-list");

    alerts.forEach((alert) => {
      const paragraph = document.createElement("p");
      paragraph.textContent = alert.message ?? "";
      paragraph.style.backgroundColor =
        alert.background ?? alert.backgroundColor ?? "";
      paragraph.style.color =
        alert.color ?? alert.foreground ?? alert.foregroundColor ?? "";
      alertList.appendChild(paragraph);
    });

    (document.querySelector("main") ?? document.body).prepend(alertList);
  }
}

export function prefersReducedMotion() {
  return (
    window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false
  );
}

// a quick pop to show that something changed, such as a Pokémon joining the team
export function pulse(element) {
  if (!element || prefersReducedMotion()) {
    return;
  }
  element.classList.remove("pulse");
  // reading the layout restarts the animation if it is already running
  element.getBoundingClientRect();
  element.classList.add("pulse");
  element.addEventListener(
    "animationend",
    () => element.classList.remove("pulse"),
    { once: true },
  );
}

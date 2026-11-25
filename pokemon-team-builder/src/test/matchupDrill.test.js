/**
 * @jest-environment jsdom
 */
import MatchupDrill, { HOVER_DELAY_MS } from "../js/matchupDrill.js";
import { analysisTemplate } from "../js/renderer.js";
import { analyzeTeam } from "../js/teamAnalysis.js";

const charmander = { name: "charmander", types: ["fire"] };
const bulbasaur = { name: "bulbasaur", types: ["grass", "poison"] };

let container;
let drill;
let openDetails;
let analysis;

function hover(element, type = "mouseover", relatedTarget = null) {
  element.dispatchEvent(new MouseEvent(type, { bubbles: true, relatedTarget }));
}

const rowFor = (type) =>
  container.querySelector(`.matchups tbody tr[data-type="${type}"]`);
const panel = () => container.querySelector("#matchup-popover");
const isOpen = () => !panel().classList.contains("hide");

function draw() {
  analysis = analyzeTeam([charmander, bulbasaur]);
  container.innerHTML = analysisTemplate(analysis);
  drill.setRows(analysis.defense);
}

beforeEach(() => {
  jest.useFakeTimers();
  document.body.innerHTML = '<div id="analysis"></div><p id="elsewhere"></p>';
  container = document.querySelector("#analysis");
  openDetails = jest.fn();
  drill = new MatchupDrill(container, { openDetails });
  drill.init();
  draw();
});

afterEach(() => {
  jest.useRealTimers();
});

describe("hovering", () => {
  test("opens only after the pointer rests on a row", () => {
    hover(rowFor("water"));
    jest.advanceTimersByTime(HOVER_DELAY_MS - 100);
    expect(isOpen()).toBe(false);
    jest.advanceTimersByTime(100);
    expect(isOpen()).toBe(true);
  });

  test("lists who is weak, who resists, and by how much", () => {
    hover(rowFor("water"));
    jest.advanceTimersByTime(HOVER_DELAY_MS);
    const text = panel().textContent;
    expect(text).toMatch(/Weak\s*Charmander\s*2×/);
    expect(text).toMatch(/Resist\s*Bulbasaur\s*½×/);
  });

  test("leaving before the delay cancels it", () => {
    const row = rowFor("water");
    hover(row);
    jest.advanceTimersByTime(500);
    hover(row, "mouseout", document.body);
    jest.advanceTimersByTime(5000);
    expect(isOpen()).toBe(false);
  });

  test("sweeping across rows opens nothing", () => {
    ["fire", "water", "ice"].forEach((type) => {
      hover(rowFor(type));
      jest.advanceTimersByTime(300);
      hover(rowFor(type), "mouseout", document.body);
    });
    jest.advanceTimersByTime(5000);
    expect(isOpen()).toBe(false);
  });

  test("moving between cells of one row does not restart or cancel it", () => {
    const row = rowFor("water");
    hover(row.cells[0]);
    jest.advanceTimersByTime(600);
    hover(row.cells[0], "mouseout", row.cells[1]);
    hover(row.cells[1]);
    jest.advanceTimersByTime(HOVER_DELAY_MS);
    expect(isOpen()).toBe(true);
  });

  test("closes shortly after the pointer leaves", () => {
    hover(rowFor("water"));
    jest.advanceTimersByTime(HOVER_DELAY_MS);
    hover(rowFor("water"), "mouseout", document.body);
    jest.advanceTimersByTime(400);
    expect(isOpen()).toBe(false);
  });

  test("stays open when the pointer moves onto the panel", () => {
    hover(rowFor("water"));
    jest.advanceTimersByTime(HOVER_DELAY_MS);
    const link = panel().querySelector(".matchup-popover__pokemon");
    hover(rowFor("water"), "mouseout", link);
    hover(link);
    jest.advanceTimersByTime(2000);
    expect(isOpen()).toBe(true);
  });

  test("a type nobody is affected by never opens", () => {
    // dragon is neutral against fire, grass and poison
    expect(rowFor("dragon").querySelector(".matchup__toggle")).toBeNull();
    hover(rowFor("dragon"));
    jest.advanceTimersByTime(5000);
    expect(isOpen()).toBe(false);
  });
});

describe("selecting", () => {
  const toggle = (type) =>
    container.querySelector(`.matchup__toggle[data-type="${type}"]`);

  test("a click opens at once and marks the button expanded", () => {
    toggle("fire").click();
    expect(isOpen()).toBe(true);
    expect(toggle("fire").getAttribute("aria-expanded")).toBe("true");
    expect(toggle("water").getAttribute("aria-expanded")).toBe("false");
  });

  test("clicking the open type again closes it", () => {
    toggle("fire").click();
    toggle("fire").click();
    expect(isOpen()).toBe(false);
    expect(toggle("fire").getAttribute("aria-expanded")).toBe("false");
  });

  test("clicking another type switches the panel", () => {
    toggle("fire").click();
    toggle("water").click();
    expect(panel().textContent).toContain("Water");
    expect(toggle("fire").getAttribute("aria-expanded")).toBe("false");
  });

  test("Escape closes it and returns focus to the button", () => {
    toggle("fire").click();
    toggle("fire").dispatchEvent(
      new KeyboardEvent("keydown", { key: "Escape", bubbles: true }),
    );
    expect(isOpen()).toBe(false);
    expect(document.activeElement).toBe(toggle("fire"));
  });

  test("a click outside the report closes it", () => {
    toggle("fire").click();
    document.querySelector("#elsewhere").click();
    expect(isOpen()).toBe(false);
  });

  test("choosing a Pokémon asks for its details", () => {
    toggle("water").click();
    panel().querySelector('[data-name="bulbasaur"]').click();
    expect(openDetails).toHaveBeenCalledWith("bulbasaur");
  });

  test("a redraw of the report starts fresh", () => {
    toggle("fire").click();
    draw();
    expect(isOpen()).toBe(false);
    toggle("fire").click();
    expect(isOpen()).toBe(true);
  });
});

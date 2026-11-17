import { changeScene } from "./scene";

let battleRoot: HTMLElement | null = null;
let onWin: (() => void) | null = null;
let battleOver = false;
let onEscape: (() => void) | null = null;

function setLog(message: string) {
  const log = battleRoot?.querySelector("#battle-log");
  if (log) {
    log.textContent = message;
  }
}

export function startBattle(winCallback: () => void, escapeCallback: () => void) {
  onWin = winCallback;
  onEscape = escapeCallback;
  battleOver = false;
  setLog("キノコの魔物があらわれた！");
  changeScene("battle");
}

export function setupBattle(root: HTMLElement) {
  battleRoot = root;

  root.innerHTML = `
    <h2>バトル</h2>
    <img src="assets/mushroom.png" class="battle-enemy" alt="キノコの魔物">
    <p id="battle-log"></p>
    <div class="commands">
      <button id="attack-button">たたかう</button>
      <button id="run-button">にげる</button>
    </div>
  `;

  root.querySelector("#attack-button")?.addEventListener("click", () => {
    if ( battleOver) {
      return;
    }
    battleOver = true;
    setLog("キノコの魔物をたおした！");

    setTimeout(() => {
      onWin?.();
      changeScene("field");
    }, 1000);
  });

  root.querySelector("#run-button")?.addEventListener("click", () => {
    if (battleOver) {
      return;
    }
    if (Math.random() < 0.5) {
      setLog("にげられなかった！");
      return;
    }

    battleOver = true;
    setLog("うまくにげきれた！");
    setTimeout(() => {
      onEscape?.();
      changeScene("field");
    }, 800);
  });
}
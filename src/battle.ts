import { changeScene } from "./scene";

export function setupBattle(root: HTMLElement) {
  root.innerHTML = `
    <h2>バトル</h2>
    <p>まものがあらわれた！</p>
    <p id="battle-log"></p>
    <button id="attack-button">たたかう</button>
    <button id="run-button">にげる</button>
  `;

  root.querySelector("#run-button")?.addEventListener("click", () => {
    changeScene("field");
  });

  root.querySelector("#attack-button")?.addEventListener("click", () => {
    const log = root.querySelector("#battle-log");
    if (log) {
      log.textContent = "勇者のこうげき";
    }
  });
}
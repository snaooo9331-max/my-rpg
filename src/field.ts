import { changeScene } from "./scene";

export function setupField(root: HTMLElement) {
  root.innerHTML = `
    <h2>フィールド</h2>
    <img src="assets/hero.png" class="sprite" alt="勇者">
    <div>
      <button id="encounter-button">敵に出会う（仮）</button>
    </div>
  `;

  root.querySelector("#encounter-button")?.addEventListener("click", () => {
    changeScene("battle");
  });
}
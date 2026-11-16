import "./style.css";
import { setupField } from "./field";
import { setupBattle } from "./battle";
import { changeScene } from "./scene";

const app = document.querySelector<HTMLDivElement>("#app");

if (app) {
  app.innerHTML = `
    <h1>My RPG</h1>
    <div id="field-screen"></div>
    <div id="battle-screen"></div>
  `;

  const fieldScreen = document.getElementById("field-screen");
  const battleScreen = document.getElementById("battle-screen");

  if (fieldScreen && battleScreen) {
    setupField(fieldScreen);
    setupBattle(battleScreen);
  }

  changeScene("field");
}
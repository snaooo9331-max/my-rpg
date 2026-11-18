import "./style.css";
import { setupField } from "./field";
import { setupBattle } from "./battle";
import { changeScene } from "./scene";
import { setupMenu } from "./menu";

const app = document.querySelector<HTMLDivElement>("#app");

if (app) {
  app.innerHTML = `
    <h1>My RPG</h1>
    <div id="field-screen"></div>
    <div id="battle-screen"></div>
    <div id="menu-screen"></div>
  `;

  const fieldScreen = document.getElementById("field-screen");
  const battleScreen = document.getElementById("battle-screen");
  const menuScreen = document.getElementById("menu-screen");

  if (fieldScreen && battleScreen && menuScreen) {
    setupField(fieldScreen);
    setupBattle(battleScreen);
    setupMenu(menuScreen);
  }

  changeScene("field");
}
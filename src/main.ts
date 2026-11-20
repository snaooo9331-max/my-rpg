import "./style.css";
import { setupField, updateFieldStatus, showFieldMessage } from "./field";
import { setupBattle } from "./battle";
import { changeScene } from "./scene";
import { setupMenu } from "./menu";
import { loadGame, saveGame, startAutoSave } from "./save";
import { giveOfflineReward } from "./offline";

let hiddenAt: number | null = null;

function checkOfflineReward(since: number) {
  const report = giveOfflineReward(since);
  if (report) {
    saveGame();
    updateFieldStatus();
    showFieldMessage(report);
  }
}

const app = document.querySelector<HTMLDivElement>("#app");

if (app) {
  const lastSaveTime = loadGame();

  app.innerHTML = `
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

  if (lastSaveTime !== null) {
    checkOfflineReward(lastSaveTime);
  }

  startAutoSave();

  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") {
      hiddenAt = Date.now();
    } else {
      if (hiddenAt !== null) {
        checkOfflineReward(hiddenAt);
        hiddenAt = null;
      }
    }
  });
}
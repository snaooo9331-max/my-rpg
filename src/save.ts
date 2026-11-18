import { player, type Character } from "./player";

const SAVE_KEY = "myRpgSave";
let saveEnabled = true;

type SaveData = {
  player: Character;
  lastSaveTime: number;
};

export function saveGame() {
  if (!saveEnabled) {
    return;
  }
  const data: SaveData = {
    player: player,
    lastSaveTime: Date.now(),
  };
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(data));
  } catch {

  }
}

export function loadGame(): number | null {
  try {
    const saved = localStorage.getItem(SAVE_KEY);
    if (saved === null) {
      return null;
    }
    const data = JSON.parse(saved) as SaveData;
    Object.assign(player, data.player);
    return data.lastSaveTime ?? null;
  } catch {
    return null;
  }
}

export function deleteSave() {
  saveEnabled = false;
  try {
    localStorage.removeItem(SAVE_KEY);
  } catch {

  }
}

export function startAutoSave() {
  setInterval(saveGame, 5000);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") {
      saveGame();
    }
  });
}
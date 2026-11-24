import { player, emptyEquipment, type Character } from "./player";

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

    const savedPlayer = data.player as Partial<Character> & {
      skillPoints?: number;
      weapon?: string | null;
      armor?: string | null;
    };

    if (savedPlayer.skillPoints !== undefined) {
      savedPlayer.statPoints ??= savedPlayer.skillPoints;
      delete savedPlayer.skillPoints;
    }

    savedPlayer.equipment = {
      ...emptyEquipment(),
      weapon: savedPlayer.weapon ?? null,
      body: savedPlayer.armor ?? null,
      ...savedPlayer.equipment,
    };
    delete savedPlayer.weapon;
    delete savedPlayer.armor;
    
    Object.assign(player, savedPlayer);

    if (typeof player.gold !== "number" || Number.isNaN(player.gold)) {
      player.gold = 0;
    }
    if (typeof player.exp !== "number" || Number.isNaN(player.exp)) {
      player.exp = 0;
    }
    return data.lastSaveTime ?? null;
  } catch (error) {
    console.error("セーブデータの読み込みに失敗しました", error);
    saveEnabled = false;
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
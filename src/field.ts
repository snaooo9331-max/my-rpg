import { getScene } from "./scene";
import { MAP_WIDTH, MAP_HEIGHT, getTile, isWalkable } from "./map";
import { startBattle } from "./battle";
import { player, expToNext, START_X, START_Y } from "./player";
import { MONSTERS } from "./monster";
import { openMenu, MENU_TABS, TAB_LABELS, type MenuTab } from "./menu";

const TILE_SIZE = 32;
const VIEW_W = 11;
const VIEW_H = 11;
const SWIPE_THRESHOLD = 24;
const WLAK_INTERVAL_MS = 180;

let touchStartX = 0;
let touchStartY = 0;
let touchDirection: string | null = null;
let walkTimer: number | null = null;

const DIRECTIONS: Record<string, [number, number]> = {
  up: [0,-1],
  down: [0, 1],
  left: [-1, 0],
  right: [1,0],
};

const KEY_TO_DIRECTION: Record<string, string> = {
  ArrowUp: "up",
  ArrowDown: "down",
  ArrowLeft: "left",
  ArrowRight: "right",
  w: "up",
  a: "left",
  s: "down",
  d: "right",
};

const HERO_IMAGES: Record<string, string> = {
  down: "hero",
  up: "hero_up",
  left: "hero_left",
  right: "hero_right",
};

type FieldEnemy = {
  id: number;
  x: number;
  y: number;
  monsterId: string;
  alive: boolean; 
};

const fieldEnemies: FieldEnemy[] = [
  { id: 1, x: 6, y: 3, monsterId: "mushroom", alive: true },
  { id: 2, x: 3, y: 5, monsterId: "poisonMushroom", alive: true },
  { id: 3, x: 8, y: 1, monsterId: "mushroom", alive: true },
  { id: 4, x: 13, y: 8, monsterId: "mushroom", alive: true },
  { id: 5, x: 4, y: 12, monsterId: "mushroom", alive: true },
  { id: 6, x: 21, y: 11, monsterId: "mushroom", alive: true },
  { id: 7, x: 21, y: 5, monsterId: "poisonMushroom", alive: true },
  { id: 8, x: 16, y: 15, monsterId: "poisonMushroom", alive: true },
];

export function updateFieldStatus() {
  const status = document.getElementById("field-status");
  if (status) {
    const next = expToNext(player.level) - player.exp;
    status.textContent = `Lv${player.level} HP ${player.hp} / ${player.maxHp} ${player.gold}G SP ${player.skillPoints} 次のレベルまで ${next} 転生回数 ${player.rebirthCount}`;
  }
}

export function showFieldMessage(text: string) {
  const element = document.getElementById("field-message");
  if (element) {
    element.textContent = text;
    setTimeout(() => {
      element.textContent = "";
    }, 6000);
  }
}

const RESPAWN_MS = 10000;

function scheduleRespawn(enemy: FieldEnemy) {
  setTimeout(() => {
    if (enemy.x === player.x && enemy.y === player.y) {
      scheduleRespawn(enemy);
      return;
    }
    enemy.alive = true;
    document.getElementById("enemy-" + enemy.id)?.classList.remove("hidden");
  }, RESPAWN_MS);
}

function checkEncounter(prevX: number, prevY: number) {
  const enemy = fieldEnemies.find(
    (e) => e.alive && e.x === player.x && e.y === player.y
  );
  if (!enemy) {
    return;
  }

  startBattle({
    monsterId: enemy.monsterId,
    onWin: () => {
      enemy.alive = false;
      document.getElementById("enemy-" + enemy.id)?.classList.add("hidden");
      scheduleRespawn(enemy);
      updateFieldStatus();
    },
    onEscape: () => {
      player.x = prevX;
      player.y = prevY;
      drawHero();
      updateFieldStatus();
    },
    onLose: () => {
      player.x = START_X;
      player.y = START_Y;
      player.hp = player.maxHp;
      drawHero();
      updateFieldStatus();
    },
  });
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function updateCamera() {
  const map = document.getElementById("map");
  if (!map) {
    return;
  }
  const cameraX = clamp(player.x - Math.floor(VIEW_W /2), 0, MAP_WIDTH - VIEW_W);
  const cameraY = clamp(player.y - Math.floor(VIEW_H /2), 0, MAP_HEIGHT - VIEW_H);
  map.style.transform = `translate(${-cameraX * TILE_SIZE}px, ${-cameraY * TILE_SIZE}px)`;
}

function drawHero() {
  const hero = document.getElementById("hero");
  if (hero) {
    hero.style.left = player.x * TILE_SIZE + "px";
    hero.style.top = player.y * TILE_SIZE + "px";
  }
  updateCamera();
}

function turnHero(direction: string) {
  const hero = document.getElementById("hero") as HTMLImageElement | null;
  const image = HERO_IMAGES[direction];
  if (hero && image) {
    hero.src = "assets/" + image + ".png";
  }
}

function moveHero(direction: string) {
  const delta = DIRECTIONS[direction];
  if (!delta) {
    return;
  }

  turnHero(direction);

  const nextX = player.x + delta[0];
  const nextY = player.y + delta[1];

  if (isWalkable(nextX, nextY)) {
    const prevX = player.x;
    const prevY = player.y;
    player.x = nextX;
    player.y = nextY;
    drawHero();
    checkEncounter(prevX, prevY);
  }
}

function directionFromDrag(dx: number, dy: number): string | null {
  if (Math.abs(dx) < SWIPE_THRESHOLD && Math.abs(dy) < SWIPE_THRESHOLD) {
    return null;
  }
  if (Math.abs(dx) > Math.abs(dy)) {
    return dx > 0 ? "right" : "left";
  }
  return dy > 0 ? "down" : "up";
}

function stopWalking() {
  touchDirection = null;
  if (walkTimer !== null) {
    clearInterval(walkTimer);
    walkTimer = null;
  }
}

function startWalking(direction: string) {
  if (touchDirection === direction) {
    return;
  }
  stopWalking();
  touchDirection = direction;
  moveHero(direction);
  walkTimer = window.setInterval(() => {
    if (getScene() !== "field") {
      stopWalking();
      return;
    }
    moveHero(direction);
  }, WLAK_INTERVAL_MS);
}

export function setupField(root: HTMLElement) {
  const menuButtons = MENU_TABS.map((tab) => `
    <button data-menu="${tab}">${TAB_LABELS[tab]}</button>
  `).join("");

  root.innerHTML = `
    <div class="top-bar">${menuButtons}</div>
    <p id="field-status" class="status"></p>
    <p id="field-message" class="message"></p>
    <div class="viewport" id="viewport">
      <div class="map" id="map"></div>
    </div>
  `;

  const map = root.querySelector<HTMLDivElement>("#map");
  if (!map) {
    return;
  }

  const viewport = root.querySelector<HTMLDivElement>("#viewport");
  if (viewport) {
    viewport.style.width = VIEW_W * TILE_SIZE + "px";
    viewport.style.height = VIEW_H * TILE_SIZE + "px";
  }

  map.style.width = MAP_WIDTH * TILE_SIZE + "px";
  map.style.height = MAP_HEIGHT * TILE_SIZE + "px";

  for (let y = 0; y < MAP_HEIGHT; y++) {
    for (let x = 0; x < MAP_WIDTH; x++) {
      const tile = document.createElement("img");
      tile.src = "assets/" + getTile(x, y) + ".png";
      tile.className = "tile";
      tile.style.left = x * TILE_SIZE + "px";
      tile.style.top = y * TILE_SIZE + "px";
      map.appendChild(tile);
    }
  }

  fieldEnemies.forEach((enemy) => {
    const img = document.createElement("img");
    img.src = "assets/" + MONSTERS[enemy.monsterId].image + ".png";
    img.id = "enemy-" + enemy.id;
    img.className = "tile";
    img.style.left = enemy.x * TILE_SIZE + "px";
    img.style.top = enemy.y * TILE_SIZE + "px";

    if (enemy.x === player.x && enemy.y === player.y)  {
      enemy.alive = false;
      img.classList.add("hidden");
      scheduleRespawn(enemy);
    }

    map.appendChild(img);
  });

  const hero = document.createElement("img");
  hero.src = "assets/hero.png";
  hero.id = "hero";
  hero.className = "tile hero";
  map.appendChild(hero);
  drawHero();

  window.addEventListener("keydown", (event) => {
    if (getScene() !== "field") {
      return;
    }
    const direction = KEY_TO_DIRECTION[event.key];
    if (direction) {
      event.preventDefault();
      moveHero(direction);
    }
  });

  root.addEventListener("touchstart", (event) => {
    const touch = event.touches[0];
    touchStartX = touch.clientX;
    touchStartY = touch.clientY;
  }, { passive: true });

  root.addEventListener("touchmove", (event) => {
    event.preventDefault();
    const touch = event.touches[0];
    const direction = directionFromDrag(
      touch.clientX - touchStartX,
      touch.clientY - touchStartY
    );
    if (direction) {
      startWalking(direction);
    }
  }, { passive: false });

  root.addEventListener("touchend", stopWalking);
  root.addEventListener("touchcancel", stopWalking);

  root.querySelectorAll<HTMLButtonElement>("[data-menu]").forEach((button) => {
    button.addEventListener("click", () => {
      openMenu(button.dataset.menu as MenuTab, updateFieldStatus);
    });
  });

  updateFieldStatus();
}
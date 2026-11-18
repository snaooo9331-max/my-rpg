import { getScene } from "./scene";
import { MAP_WIDTH, MAP_HEIGHT, getTile, isWalkable } from "./map";
import { startBattle } from "./battle";
import { player, expToNext } from "./player";
import { MONSTERS } from "./monster";
import { openMenu } from "./menu";

const TILE_SIZE = 32;

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

let heroX = 2;
let heroY = 2;

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
];

function updateFieldStatus() {
  const status = document.getElementById("field-status");
  if (status) {
    const next = expToNext(player.level) - player.exp;
    status.textContent = `Lv${player.level} HP ${player.hp} / ${player.maxHp} ${player.gold}G SP ${player.skillPoints} 次のレベルまで ${next} `;
  }
}

const RESPAWN_MS = 3000;

function scheduleRespawn(enemy: FieldEnemy) {
  setTimeout(() => {
    if (enemy.x === heroX && enemy.y === heroY) {
      scheduleRespawn(enemy);
      return;
    }
    enemy.alive = true;
    document.getElementById("enemy-" + enemy.id)?.classList.remove("hidden");
  }, RESPAWN_MS);
}

function checkEncounter(prevX: number, prevY: number) {
  const enemy = fieldEnemies.find(
    (e) => e.alive && e.x === heroX && e.y === heroY
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
      heroX = prevX;
      heroY = prevY;
      drawHero();
      updateFieldStatus();
    },
    onLose: () => {
      heroX = 2;
      heroY = 2;
      player.hp = player.maxHp;
      drawHero();
      updateFieldStatus();
    },
  });
}

function drawHero() {
  const hero = document.getElementById("hero");
  if (hero) {
    hero.style.left = heroX * TILE_SIZE + "px";
    hero.style.top = heroY * TILE_SIZE + "px";
  }
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

  const nextX = heroX + delta[0];
  const nextY = heroY + delta[1];

  if (isWalkable(nextX, nextY)) {
    const prevX = heroX;
    const prevY = heroY;
    heroX = nextX;
    heroY = nextY;
    drawHero();
    checkEncounter(prevX, prevY);
  }
}

export function setupField(root: HTMLElement) {
  root.innerHTML = `
    <p id="field-status" class="status"></p>
    <div class="map" id="map"></div>
    <div class="dpad">
      <span></span>
      <button data-dir="up">▲</button>
      <span></span>
      <button data-dir="left">◀︎</button>
      <button data-dir="down">▼</button>
      <button data-dir="right">▶</button>
    </div>
    <button id="menu-button">メニュー</button>
  `;

  const map = root.querySelector<HTMLDivElement>("#map");
  if (!map) {
    return;
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
    map.appendChild(img);
  });

  const hero = document.createElement("img");
  hero.src = "assets/hero.png";
  hero.id = "hero";
  hero.className = "tile hero";
  map.appendChild(hero);
  drawHero();

  root.querySelectorAll<HTMLButtonElement>("[data-dir]").forEach((button) => {
    button.addEventListener("click", () => {
      moveHero(button.dataset.dir ?? "");
    });
  });

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

  root.querySelector("#menu-button")?.addEventListener("click", () => {
    openMenu(() => {
      updateFieldStatus();
    });
  });

  updateFieldStatus();
}
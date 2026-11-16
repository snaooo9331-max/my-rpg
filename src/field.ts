import { changeScene, getScene } from "./scene";
import { MAP_WIDTH, MAP_HEIGHT, getTile, isWalkable } from "./map";

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

let heroX = 2;
let heroY = 2;

function drawHero() {
  const hero = document.getElementById("hero");
  if (hero) {
    hero.style.left = heroX * TILE_SIZE + "px";
    hero.style.top = heroY * TILE_SIZE + "px";
  }
}

function moveHero(direction: string) {
  const delta = DIRECTIONS[direction];
  if (!delta) {
    return;
  }

  const nextX = heroX + delta[0];
  const nextY = heroY + delta[1];

  if (isWalkable(nextX, nextY)) {
    heroX = nextX;
    heroY = nextY;
    drawHero();
  }
}

export function setupField(root: HTMLElement) {
  root.innerHTML = `
    <div class="map" id="map"></div>
    <div class="dpad">
      <span></span>
      <button data-dir="up">▲</button>
      <span></span>
      <button data-dir="left">◀︎</button>
      <button data-dir="down">▼</button>
      <button data-dir="right">▶</button>
    </div>
    <button id="encounter-button">敵に出会う（仮）</button>
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

  root.querySelector("#encounter-button")?.addEventListener("click", () => {
    changeScene("battle");
  });
}
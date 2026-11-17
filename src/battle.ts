import { changeScene } from "./scene";
import { player } from "./player";
import { MONSTERS, type MonsterData } from "./monster";

type BattleOptions = {
  monsterId: string;
  onWin: () => void;
  onEscape: () => void;
  onLose: () => void;
}

let battleRoot: HTMLElement | null = null;
let options: BattleOptions | null = null;
let enemy: MonsterData = MONSTERS.mushroom;
let enemyHp = 0;
let busy = false;

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function calcDamage(attack: number, defense: number): number {
  const random = Math.floor(Math.random() * 3) - 1;
  return Math.max(1, attack - defense + random);
}

function setText(id: string, text: string) {
  const element = battleRoot?.querySelector("#" + id);
  if ( element) {
    element.textContent = text;
  }
}

function updateStatus() {
  setText("enemy-status", `${enemy.name} HP ${enemyHp} / ${enemy.maxHp}`);
  setText("player-status", `${player.name} HP ${player.hp} / ${player.maxHp}`);
}

export function startBattle(BattleOptions: BattleOptions) {
  options = BattleOptions;
  enemy = MONSTERS[BattleOptions.monsterId] ?? MONSTERS.mushroom;
  enemyHp = enemy.maxHp;
  busy = false;

  const image = battleRoot?.querySelector<HTMLImageElement>("#battle-enemy-image");
  if (image) {
    image.src = "assets/" + enemy.image + ".png";
  }

  updateStatus();
  setText("battle-log", `${enemy.name}があらわれた！`);
  changeScene("battle");
}

async function enemyTurn(): Promise<boolean> {
  await wait(800);
  const damage = calcDamage(enemy.attack, player.defense);
  player.hp = Math.max(0, player.hp - damage);
  setText("battle-log", `${enemy.name}のこうげき！ ${player.name}は ${damage}のダメージをうけた！`);
  updateStatus();

  if (player.hp <= 0) {
    await wait(1000);
    setText("battle-log", `${player.name}はたおれてしまった...`);
    await wait(1500);
    options?.onLose();
    changeScene("field");
    return false;
  }
  return true;
}

async function attack() {
  if (busy) {
    return;
  }
  busy = true;

  const damage = calcDamage(player.attack, enemy.defense);
  enemyHp = Math.max(0, enemyHp - damage);
  setText("battle-log", `${player.name}のこうげき！ ${enemy.name}に${damage}のダメージ！`);
  updateStatus();

  if ( enemyHp <= 0) {
    await wait(1000);
    setText("battle-log", `${enemy.name}をたおした！`);
    await wait(1000);
    options?.onWin();
    changeScene("field");
    return;
  }

  if (await enemyTurn()) {
    busy = false;
  }
}

async function run() {
  if (busy) {
    return;
  }
  busy = true;

  if (Math.random() < 0.5) {
    setText("battle-log", "にげられなかった！");
    if (await enemyTurn()) {
      busy = false;
    }
    return;
  }

  setText("battle-log", "うまくにげきれた！");
  await wait(800);
  options?.onEscape();
  changeScene("field");
}

export function setupBattle(root: HTMLElement) {
  battleRoot = root;

  root.innerHTML = `
    <p id="enemy-status"></p>
    <img id="battle-enemy-image" class="battle-enemy" alt="キノコの魔物">
    <p id="battle-log" class="battle-log"></p>
    <p id="player-status"></p>
    <div class="commands">
      <button id="attack-button">たたかう</button>
      <button id="run-button">にげる</button>
    </div>
  `;

  root.querySelector("#attack-button")?.addEventListener("click", attack);
  root.querySelector("#run-button")?.addEventListener("click", run);
}
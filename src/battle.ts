import { changeScene } from "./scene";
import { player, gainExp, getAttack, getDefense} from "./player";
import { MONSTERS, type MonsterData } from "./monster";
import { setTextById, setBar } from "./ui";

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
let autoMode = false;
let inBattle = false;

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function calcDamage(attack: number, defense: number): number {
  const random = Math.floor(Math.random() * 3) - 1;
  return Math.max(1, attack - defense + random);
}

async function scheduleAuto() {
  if (!autoMode) {
    return;
  }
  await wait(600);
  if (autoMode && inBattle && !busy) {
    attack();
  }
}

function updateAutoButton() {
  const button = battleRoot?.querySelector("#auto-button");
  if (button) {
    button.textContent = autoMode ? "オート：ON" : "オート：OFF";
    button.classList.toggle("auto-on", autoMode);
  }
}

function toggleAuto() {
  autoMode = !autoMode;
  updateAutoButton();
  scheduleAuto();
}

function updateStatus() {
  setTextById("battle-enemy-name", enemy.name);
  setTextById("battle-player-level", `Lv${player.level}`);
  setTextById("battle-player-hp", `${player.hp} / ${player.maxHp}`);
  setTextById("battle-enemy-hp", `${enemyHp} / ${enemy.maxHp}`);

  const enemyPercent = (enemyHp / enemy.maxHp) * 100;
  const playerPercent = (player.hp / player.maxHp) * 100;

  setBar("battle-enemy-hp-fill", enemyPercent);
  setBar("battle-player-hp-fill", playerPercent);
  document.getElementById("battle-player-hp-fill")?.classList.toggle("low", playerPercent <= 30);
}

export function startBattle(BattleOptions: BattleOptions) {
  options = BattleOptions;
  enemy = MONSTERS[BattleOptions.monsterId] ?? MONSTERS.mushroom;
  enemyHp = enemy.maxHp;
  busy = false;
  inBattle = true;

  const image = battleRoot?.querySelector<HTMLImageElement>("#battle-enemy-image");
  if (image) {
    image.src = "assets/" + enemy.image + ".png";
  }

  updateStatus();
  setTextById("battle-log", `${enemy.name}があらわれた！`);
  changeScene("battle");
  scheduleAuto();
}

async function enemyTurn(): Promise<boolean> {
  await wait(800);
  const damage = calcDamage(enemy.attack, getDefense());
  player.hp = Math.max(0, player.hp - damage);
  setTextById("battle-log", `${enemy.name}のこうげき！ ${player.name}は ${damage}のダメージをうけた！`);
  updateStatus();

  if (player.hp <= 0) {
    inBattle = false;
    await wait(1000);
    setTextById("battle-log", `${player.name}はたおれてしまった...`);
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

  const damage = calcDamage(getAttack(), enemy.defense);
  enemyHp = Math.max(0, enemyHp - damage);
  setTextById("battle-log", `${player.name}のこうげき！ ${enemy.name}に${damage}のダメージ！`);
  updateStatus();

  if ( enemyHp <= 0) {
    inBattle = false;
    await wait(1000);
    setTextById("battle-log", `${enemy.name}をたおした！`);
    await wait(1000);

    player.gold += enemy.gold;
    setTextById("battle-log", `${enemy.exp} のけいけんちと ${enemy.gold} ゴールドをてにいれた！`);
    const levelUps = gainExp(enemy.exp);
    for (const message of levelUps) {
      await wait(1200);
      setTextById("battle-log", message);
      updateStatus();
    }
    await wait(1200);
    options?.onWin();
    changeScene("field");
    return;
  }

  if (await enemyTurn()) {
    busy = false;
    scheduleAuto();
  }
}

async function run() {
  if (busy) {
    return;
  }
  busy = true;

  if (Math.random() < 0.5) {
    setTextById("battle-log", "にげられなかった！");
    if (await enemyTurn()) {
      busy = false;
      scheduleAuto();
    }
    return;
  }

  inBattle = false;
  setTextById("battle-log", "うまくにげきれた！");
  await wait(800);
  options?.onEscape();
  changeScene("field");
}

export function setupBattle(root: HTMLElement) {
  battleRoot = root;

  root.innerHTML = `
    <div class="window battle-player">
      <div class="hud-row">
        <span>勇者</span>
        <span id="battle-player-level"></span>
      </div>
      <div class="bar-label">HP <span id="battle-player-hp"></span></div>
      <div class="bar"><div id="battle-player-hp-fill" class="bar-fill hp"></div></div>
    </div>
    <div class="battle-stage">
      <img id="battle-enemy-image" class="battle-enemy" alt="">
      <div class="enemy-info">
        <span id="battle-enemy-name"></span>
        <div class="bar-label">HP <span id="battle-enemy-hp"></span></div>
        <div class="bar"><div id="battle-enemy-hp-fill" class="bar-fill enemy"></div></div>
      </div>
    </div>
    <p id="battle-log" class="window battle-log"></p>
    <div class="window commands">
      <button id="attack-button">たたかう</button>
      <button id="run-button">にげる</button>
      <button id="auto-button">オート：OFF</button>
    </div>
  `;

  root.querySelector("#attack-button")?.addEventListener("click", attack);
  root.querySelector("#run-button")?.addEventListener("click", run);
  root.querySelector("#auto-button")?.addEventListener("click", toggleAuto);
  updateAutoButton();
}
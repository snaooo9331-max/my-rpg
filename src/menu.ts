import { changeScene } from "./scene";
import { player, getAttack, getDefense, canRebirth, rebirth, REBIRTH_LEVEL, expToNext } from "./player";
import { ITEMS, findItem, type ItemData } from "./items"; 
import { STAT_UPGRADES, STAT_LABELS, type StatName } from "./upgrades";
import { deleteSave, saveGame } from "./save";

export type MenuTab = "status" | "equip" | "stats" | "rebirth" | "data";

export const MENU_TABS: MenuTab[] = ["status", "equip", "stats", "rebirth", "data"];

export const TAB_LABELS: Record<MenuTab, string> = {
  status: "ステータス",
  equip: "そうび",
  stats: "つよさ",
  rebirth: "転生",
  data: "データ",
};

type MenuView = "top" | MenuTab;

let currentView: MenuView = "top";

let menuRoot: HTMLElement | null = null;
let onClose: (() => void) | null = null;
let message = "";

function isEquipped(item: ItemData): boolean {
  return player.weapon === item.id || player.armor === item.id;
}

function itemStats(item: ItemData): string {
  return item.type === "weapon" ? `攻撃力 +${item.attack}` : `守備力 +${item.defense}`;
}

function itemButton(item: ItemData): string {
  if (isEquipped(item)) {
    return `<button disabled>装備中</button>`;
  }
  if (player.ownedItems.includes(item.id)) {
    return `<button data-action="equip" data-id="${item.id}">装備する</button>`;
  }
  return `<button data-action="buy" data-id="${item.id}">買う ${item.price}G</button>`;
}

function confirmUpgrades() {
  message = "";
  for (const s of STAT_UPGRADES) {
    const count = pending[s.stat];
    if (count === 0) {
      continue;
    }
    player[s.stat] += s.amount * count;
    if (s.stat === "maxHp") {
      player.hp += s.amount * count;
    }
    player.statPoints -= count;
    message += `${s.name}が${s.amount * count}上がった！<br>`;
  }
  resetPending();
}

function handleItem(action: string, id: string) {
  if (action === "plus" || action === "minus") {
    changePending(id, action === "plus" ? 1 : -1);
    message = "";
    renderMenu();
    return;
  }

  const item = ITEMS.find((i) => i.id === id);
  if (!item) {
    return;
  }

  if (action === "buy") {
    if (player.gold < item.price) {
      message = "ゴールドが足りない！";
    } else {
      player.gold -= item.price;
      player.ownedItems.push(item.id);
      message = `${item.name}を買った`;
    }
  }

  if (action === "equip") {
    if (item.type === "weapon") {
      player.weapon = item.id;
    } else {
      player.armor = item.id;
    }
    message = `${item.name}を装備した！`;
  }

  renderMenu();
}

const CURRENT_STAT: Record<StatName, () => number> = {
  attack: getAttack,
  defense: getDefense,
  maxHp: () => player.maxHp,
};

let pending: Record<StatName, number> = { attack: 0, defense: 0, maxHp: 0 };

function resetPending() {
  pending = {attack: 0, defense: 0, maxHp: 0 };
}

function pendingTotal(): number {
  return pending.attack + pending.defense + pending.maxHp;
}

function remainingPoints(): number {
  return player.statPoints - pendingTotal();
}

function changePending(id: string, diff: number) {
  const upgrade = STAT_UPGRADES.find((s) => s.id === id);
  if (!upgrade) {
    return;
  }
  if (diff > 0 && remainingPoints() <= 0) {
    return;
  }
  if (diff < 0 && pending[upgrade.stat] <= 0) {
    return;
  }
  pending[upgrade.stat] += diff;
}

function statusSection(): string {
  const weapon = findItem(player.weapon);
  const armor = findItem(player.armor);

  const rows: [string, string][] = [
    ["レベル", `${player.level}`],
    ["HP", `${player.hp} / ${player.maxHp}`],
    ["攻撃力", `${getAttack()}`],
    ["守備力", `${getDefense()}`],
    ["次のレベルまで", `${expToNext(player.level) - player.exp}`],
    ["所持金", `${player.gold}G`],
    ["強化ポイント", `${player.statPoints}`],
    ["転生回数", `${player.rebirthCount}`],
    ["武器", weapon?.name ?? "なし"],
    ["防具", armor?.name ?? "なし"],
  ];

  const html = rows.map(([label, value]) => `
    <li class="stat-row"><span>${label}</span><span>${value}</span></li>
  `).join("");

  return `<ul class="item-list">${html}</ul>`;
}

function equipSection(): string {
  const rows = ITEMS.map((item) => `
    <li class="item-row">
      <span>${item.name} (${itemStats(item)})</span>
      ${itemButton(item)}
    </li>
  `).join("");

  return `
    <h3>装備</h3>
    <ul class="item-list">${rows}</ul>
  `;
}

function statsSection(): string {
  const rows = STAT_UPGRADES.map((s) => {
    const now = CURRENT_STAT[s.stat]();
    const count = pending[s.stat];
    const valueText = count > 0 ? `${now} → <span class="after">${now + s.amount * count}</span>` : `${now}`;

    return `
      <li class="item-row">
        <div class="upgrade-info">
          <span>${s.name} (${STAT_LABELS[s.stat]}) </span>
          <span class="upgrade-value">${valueText}</span>
        </div>
        <div class="stepper">
          <button data-action="minus" data-id="${s.id}" ${count <= 0 ? "disabled" : ""}>ー</button>
          <span class="count">${count}</span>
          <button data-action="plus" data-id="${s.id}" ${remainingPoints() <= 0 ? "disabled" : ""}>＋</button>
        </div>
      </li>
    `;
  }).join("");

  return `
    <h3>強化ポイント (のこり ${remainingPoints()}) </h3>
    <ul class="item-list">${rows}</ul>
    <button id="confirm-stats" class="confirm" ${pendingTotal() === 0 ? "disabled" : ""}>けってい</button>
  `;
}

function rebirthSection(): string {
  return `
    <h3>転生 (${player.rebirthCount}回) </h3>
    <p class="status">Lv${REBIRTH_LEVEL}になると転生できます。レベルとゴールドは最初に戻りますが、ずっと強くなります</p>
    <button id="rebirth-button" ${canRebirth() ? "" : "disabled"}>転生する</button>
  `;
}

function dataSection(): string {
  return `
    <button id="delete-save" class="danger">データを消す</button>
  `;
}

const SECTIONS: Record<MenuTab, () => string> = {
  status: statusSection,
  equip: equipSection,
  stats: statsSection,
  rebirth: rebirthSection,
  data: dataSection,
};

function renderMenu() {
  if (currentView === "top") {
    renderTop();
  } else {
    renderSection(currentView);
  }
}

function renderTop() {
  if (!menuRoot) {
    return;
  }

  const buttons = MENU_TABS.map((tab) => `
    <button data-tab="${tab}">${TAB_LABELS[tab]}</button>
  `).join("");
  
  menuRoot.innerHTML = `
    <div class="window menu-header"><span>メニュー</span></div>
    <div class="window menu-list">${buttons}</div>
    <button id="close-menu" class="window menu-close">とじる</button>
  `;
  
  menuRoot.querySelectorAll<HTMLButtonElement>("[data-tab]").forEach((button) => {
    button.addEventListener("click", () => {
      currentView = button.dataset.tab as MenuTab;
      message = "";
      resetPending();
      renderMenu();
    });
  });
  
  menuRoot.querySelector("#close-menu")?.addEventListener("click", () => {
    changeScene("field");
    onClose?.();
  });
}

function renderSection(tab: MenuTab) {
  if (!menuRoot) {
    return;
  }

  menuRoot.innerHTML = `
    <div class="window menu-header">
      <span>${TAB_LABELS[tab]}</span>
      <button id="menu-back">もどる</button>
    </div>
    <div class="window menu-content">
      ${SECTIONS[tab]()}
      <p class="status">${message}</p>
    </div>
  `;

  menuRoot.querySelector("#menu-back")?.addEventListener("click", () => {
    currentView = "top";
    message = "";
    resetPending();
    renderMenu();
  });

  menuRoot.querySelectorAll<HTMLButtonElement>("[data-action]").forEach((button) => {
    button.addEventListener("click", () => {
      handleItem(button.dataset.action ?? "", button.dataset.id ?? "");
    });
  });

  menuRoot.querySelector("#delete-save")?.addEventListener("click", () => {
    if (confirm("本当にデータを消しますか？")) {
      deleteSave();
      location.reload();
    }
  });

  menuRoot.querySelector("#rebirth-button")?.addEventListener("click", () => {
    if (confirm("本当に転生しますか？")) {
      rebirth();
      saveGame();
      message = `転生した！ ${player.rebirthCount}回目の旅がはじまる`;
      renderMenu();
    }
  });

  menuRoot.querySelector("#confirm-stats")?.addEventListener("click", () => {
    confirmUpgrades();
    renderMenu();
  });
}

export function openMenu(closeCallback: () => void) {
  currentView = "top";
  onClose = closeCallback;
  message = "";
  resetPending();
  renderMenu();
  changeScene("menu");
}

export function setupMenu(root: HTMLElement) {
  menuRoot = root;
}


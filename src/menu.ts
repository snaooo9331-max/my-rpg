import { changeScene } from "./scene";
import { player, getAttack, getDefense, canRebirth, rebirth, REBIRTH_LEVEL, expToNext } from "./player";
import { ITEMS, SLOTS, SLOT_TYPE, SLOT_LABELS, findItem, bonusText, type ItemData, type Slot } from "./items"; 
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
let equipSlot: Slot | null = null;

function itemButton(item: ItemData, slot: Slot): string {
  if (player.equipment[slot] === item.id) {
    return `<button disabled>装備中</button>`;
  }
  if (player.ownedItems.includes(item.id)) {
    return `<button data-action="equip" data-id="${item.id}">装備する</button>`;
  }
  return `<button data-action="buy" data-id="${item.id}">買う ${item.price}G</button>`
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
  
  if (action === "unequip") {
    if (equipSlot !== null) {
      const item = findItem(player.equipment[equipSlot]);
      player.equipment[equipSlot] = null;
      message = `${item?.name ?? "そうび"}をはずした`;
    }
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

  if (action === "equip" && equipSlot !== null) {
    for (const slot of SLOTS) {
      if (player.equipment[slot] === item.id) {
        player.equipment[slot] = null;
      }
    }
    player.equipment[equipSlot] = item.id;
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

  const rows: [string, string][] = [
    ["レベル", `${player.level}`],
    ["HP", `${player.hp} / ${player.maxHp}`],
    ["攻撃力", `${getAttack()}`],
    ["守備力", `${getDefense()}`],
    ["次のレベルまで", `${expToNext(player.level) - player.exp}`],
    ["所持金", `${player.gold}G`],
    ["強化ポイント", `${player.statPoints}`],
    ["転生回数", `${player.rebirthCount}`],
    ...SLOTS.map((slot): [string, string] => [SLOT_LABELS[slot], findItem(player.equipment[slot])?.name ?? "なし"]),
  ];

  const html = rows.map(([label, value]) => `
    <li class="stat-row"><span>${label}</span><span>${value}</span></li>
  `).join("");

  return `<ul class="item-list">${html}</ul>`;
}

function slotListHtml(): string {
  const rows = SLOTS.map((slot) => {
    const item = findItem(player.equipment[slot]);
    return `
      <li class="slot-row" data-slot="${slot}">
        <span class="slot-label">${SLOT_LABELS[slot]}</span>
        <span class="slot-item ${item ? "" : "none"}">${item?.name ?? "そうびなし"}</span>
        <span class="slot-bonus">${item ? bonusText(item) : "-"}</span>
      </li>
    `;
  }).join("");

  return `<ul class="slot-list">${rows}</ul>`;
}

function slotItemsHtml(slot: Slot): string {
  const current = findItem(player.equipment[slot]);
  const currentText = current ? `${current.name} (${bonusText(current)})` : "そうびなし";

  const rows = ITEMS
    .filter((item) => item.type === SLOT_TYPE[slot])
    .map((item) => `
      <li class="item-row">
        <span>${item.name} (${bonusText(item)}) </span>
        ${itemButton(item, slot)}
      </li>
    `)
    .join("");

  return `
    <p class="equipped-now">いまの${SLOT_LABELS[slot]} : ${currentText}</p>
    <button data-action="unequip" class="unequip" ${current ? "" : "disabled"}>はずす</button>
    <ul class="item-list">${rows}</ul>
  `;
}

function equipSection(): string {
  if (equipSlot === null) {
    return slotListHtml();
  }
  return slotItemsHtml(equipSlot);
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
      equipSlot = null;
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

  const title = tab === "equip" && equipSlot !== null ? `${TAB_LABELS[tab]} : ${SLOT_LABELS[equipSlot]}` : TAB_LABELS[tab];

  menuRoot.innerHTML = `
    <div class="window menu-header">
      <span>${title}</span>
      <button id="menu-back">もどる</button>
    </div>
    <div class="window menu-content">
      ${SECTIONS[tab]()}
      <p class="status">${message}</p>
    </div>
  `;

  menuRoot.querySelector("#menu-back")?.addEventListener("click", () => {
    if (currentView === "equip" && equipSlot !== null) {
      equipSlot = null;
    } else {
      currentView = "top";
      resetPending();
    }
    message = "";
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

  menuRoot.querySelectorAll<HTMLElement>("[data-slot]").forEach((row) => {
    row.addEventListener("click", () => {
      equipSlot = row.dataset.slot as Slot;
      message = "";
      renderMenu();
    });
  });
}

export function openMenu(closeCallback: () => void) {
  currentView = "top";
  onClose = closeCallback;
  message = "";
  equipSlot = null;
  resetPending();
  renderMenu();
  changeScene("menu");
}

export function setupMenu(root: HTMLElement) {
  menuRoot = root;
}


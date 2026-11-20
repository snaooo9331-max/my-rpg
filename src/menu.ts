import { changeScene } from "./scene";
import { player, getAttack, getDefense, canRebirth, rebirth, REBIRTH_LEVEL } from "./player";
import { ITEMS, type ItemData } from "./items"; 
import { SKILL_UPGRADES, STAT_LABELS } from "./skills";
import { deleteSave, saveGame } from "./save";

export type MenuTab = "equip" | "skill" | "rebirth" | "data";

export const MENU_TABS: MenuTab[] = ["equip", "skill", "rebirth", "data"];

export const TAB_LABELS: Record<MenuTab, string> = {
  equip: "そうび",
  skill: "スキル",
  rebirth: "転生",
  data: "データ",
};

let currentTab: MenuTab = "equip";

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

function useSkillPoint(id: string) {
  const upgrade = SKILL_UPGRADES.find((s) => s.id === id);
  if (!upgrade || player.skillPoints <= 0) {
    return;
  }

  player.skillPoints -= 1;
  player[upgrade.stat] += upgrade.amount;

  if (upgrade.stat === "maxHp") {
    player.hp += upgrade.amount;
  }

  message = `${STAT_LABELS[upgrade.stat]}が ${upgrade.amount}上がった！`;
}

function handleItem(action: string, id: string) {
  if (action === "skill") {
    useSkillPoint(id);
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

function skillSection(): string {
  const skillRows = SKILL_UPGRADES.map((s) => `
    <li class="item-row">
      <span>${s.name} (${STAT_LABELS[s.stat]} + ${s.amount}) </span>
      <button data-action="skill" data-id="${s.id}" ${player.skillPoints <= 0 ? "disabled" : ""}>SPを使う</button>
    </li>
  `).join("");

  return `
    <h3>スキル</h3>
    <ul class="item-list">${skillRows}</ul>
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
  equip: equipSection,
  skill: skillSection,
  rebirth: rebirthSection,
  data: dataSection,
};

function renderMenu() {
  if (!menuRoot) {
    return;
  }

  const tabs = MENU_TABS.map((tab) => `
    <button class="${tab === currentTab ? "active" : ""}" data-tab="${tab}">${TAB_LABELS[tab]}</button>
  `).join("");

  menuRoot.innerHTML = `
    <div class="tab-bar">${tabs}</div>
    <p class="status">Lv${player.level} HP ${player.hp}/${player.maxHp}  ${player.gold}G</p>
    <p class="status">攻撃力 ${getAttack()} 守備力 ${getDefense()}</p>
    ${SECTIONS[currentTab]()}
    <p class="status">${message}</p>
    <button id="close-menu">とじる</button>
  `;

  menuRoot.querySelectorAll<HTMLButtonElement>("[data-tab]").forEach((button) => {
    button.addEventListener("click", () => {
      currentTab = button.dataset.tab as MenuTab;
      message = "";
      renderMenu();
    });
  });

  menuRoot.querySelectorAll<HTMLButtonElement>("[data-action]").forEach((button) => {
    button.addEventListener("click", () => {
      handleItem(button.dataset.action ?? "", button.dataset.id ?? "");
    });
  });

  menuRoot.querySelector("#close-menu")?.addEventListener("click", () =>{
    changeScene("field");
    onClose?.();
  });
  
  menuRoot.querySelector("#delete-save")?.addEventListener("click", () => {
    if (confirm("本当にデータを消しますか")) {
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
}


export function openMenu(tab: MenuTab, closeCallback: () => void) {
  currentTab = tab;
  onClose = closeCallback;
  message = "";
  renderMenu();
  changeScene("menu");
}

export function setupMenu(root: HTMLElement) {
  menuRoot = root;
}


import { changeScene } from "./scene";
import { player, getAttack, getDefense } from "./player";
import { ITEMS, type ItemData } from "./items"; 

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

function handleItem(action: string, id: string) {
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

function renderMenu() {
  if (!menuRoot) {
    return;
  }

  const rows = ITEMS.map((item) => `
    <li class="item-row">
      <span>${item.name} (${itemStats(item)}) </span>
      ${itemButton(item)}
    </li>
  `).join("");

  menuRoot.innerHTML = `
    <h2>メニュー</h2>
    <p class="status">Lv${player.level} HP ${player.hp}/${player.maxHp}  ${player.gold}G</p>
    <p class="status">攻撃力 ${getAttack()} 守備力 ${getDefense()}</p>
    <h3>装備</h3>
    <ul class="item-list">${rows}</ul>
    <p class="status">${message}</p>
    <button id="close-menu">とじる</button>
  `;

  menuRoot.querySelectorAll<HTMLButtonElement>("[data-action]").forEach((button) => {
    button.addEventListener("click", () => {
      handleItem(button.dataset.action ?? "", button.dataset.id ?? "");
    });
  });

  menuRoot.querySelector("#close-menu")?.addEventListener("click", () =>{
    changeScene("field");
    onClose?.();
  });
}

export function openMenu(closeCallback: () => void) {
  onClose = closeCallback;
  message = "";
  renderMenu();
  changeScene("menu");
}

export function setupMenu(root: HTMLElement) {
  menuRoot = root;
}


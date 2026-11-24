// =====================================================
// menu.ts
// メニュー画面：最初の画面（ボタンが並ぶ）と、5つの画面
//   ステータス / そうび / つよさ / 転生 / データ
//   使っている場所：main.ts（setupMenu）/ field.ts（openMenu）
// =====================================================

// changeScene … 画面を切り替える（メニュー ⇔ フィールド）（scene.ts）
// player など … 勇者のデータと、強さ・転生の関数（player.ts）
// ITEMS / SLOTS / SLOT_TYPE / SLOT_LABELS / findItem / bonusText … 装備と枠（items.ts）
// STAT_UPGRADES / STAT_LABELS / StatName … 強化ポイントで上げる能力（upgrades.ts）
// deleteSave / saveGame … データを消す、すぐ保存する（save.ts）
import { changeScene } from "./scene";
import { player, getAttack, getDefense, canRebirth, rebirth, REBIRTH_LEVEL, expToNext } from "./player";
import { ITEMS, SLOTS, SLOT_TYPE, SLOT_LABELS, findItem, bonusText, type ItemData, type Slot } from "./items"; 
import { STAT_UPGRADES, STAT_LABELS, type StatName } from "./upgrades";
import { deleteSave, saveGame } from "./save";

// =====================================================
// メニューの項目
// =====================================================

// MenuTab … メニューの中の画面の名前
export type MenuTab = "status" | "equip" | "stats" | "rebirth" | "data";

// MENU_TABS … 最初の画面に並べる順番（リスト）
export const MENU_TABS: MenuTab[] = ["status", "equip", "stats", "rebirth", "data"];

// TAB_LABELS … 画面の名前 → ボタンや見出しに出す名前（対応表）
//   項目を増やすときは MenuTab / MENU_TABS / TAB_LABELS / SECTIONS の4つに足す（赤線が教えてくれる）
export const TAB_LABELS: Record<MenuTab, string> = {
  status: "ステータス",
  equip: "そうび",
  stats: "つよさ",
  rebirth: "転生",
  data: "データ",
};

// MenuView … 今表示している画面。"top"（最初の画面）か、5つの画面のどれか
type MenuView = "top" | MenuTab;

// =====================================================
// メニューで覚えておくもの
// =====================================================

let currentView: MenuView = "top";            // 今どの画面を表示しているか
let menuRoot: HTMLElement | null = null;      // メニュー画面の入れ物（setupMenu でもらう）
let onClose: (() => void) | null = null;      // 「とじる」を押したときにやること（field.ts の updateFieldStatus）
let message = "";                             // 画面の下に出すメッセージ（「〇〇を買った」など）
let equipSlot: Slot | null = null;            // そうび画面で見ている枠。null なら部位の一覧を表示

// =====================================================
// そうび
// =====================================================

// itemButton … 装備の一覧の、右側のボタンを決める
//   item … その装備 / slot … 今見ている枠
//   「装備中」→「装備する」→「買う」の順に確かめて、当てはまったらすぐ返す（早期リターン）
function itemButton(item: ItemData, slot: Slot): string {
  if (player.equipment[slot] === item.id) {
    return `<button disabled>装備中</button>`;   // この枠についている
  }
  if (player.ownedItems.includes(item.id)) {     // includes … リストの中にあるか
    return `<button data-action="equip" data-id="${item.id}">装備する</button>`;   // 持っている
  }
  return `<button data-action="buy" data-id="${item.id}">買う ${item.price}G</button>`;   // 持っていない
}

// =====================================================
// つよさ（けってい）
// =====================================================

// confirmUpgrades … 仮に振った強化ポイント（pending）を、本当に勇者に反映する（「けってい」ボタン）
function confirmUpgrades() {
  message = "";   // メッセージを付け足していく前に、最初に空にする
  for (const s of STAT_UPGRADES) {     // ちから・まもり・たいりょく を順番に
    const count = pending[s.stat];     // その能力に仮に振った数
    if (count === 0) {
      continue;                        // 振っていなければ次へ（continue … この1つを飛ばす）
    }
    player[s.stat] += s.amount * count;   // player["attack"] など、名前で項目を指定して増やす
    if (s.stat === "maxHp") {
      player.hp += s.amount * count;      // 最大HPを上げたら、今のHPも同じだけ増やす
    }
    player.statPoints -= count;           // 使った分の強化ポイントを減らす
    message += `${s.name}が${s.amount * count}上がった！<br>`;   // <br> … innerHTML の中なので改行になる
  }
  resetPending();   // 仮の振り分けを0に戻す
}

// =====================================================
// ボタンを押したときの分かれ道
// =====================================================

// handleItem … data-action が付いたボタンを押したときの処理
//   action … 何をするか（plus / minus / unequip / buy / equip）
//   id     … 何に対してか（装備の id、能力の id）。「はずす」には id がない
function handleItem(action: string, id: string) {
  // つよさの「＋」「ー」（装備ではないので、ITEMS.find より前に処理する）
  if (action === "plus" || action === "minus") {
    changePending(id, action === "plus" ? 1 : -1);
    message = "";
    renderMenu();
    return;
  }
  
  // そうびの「はずす」（id がないので、これも ITEMS.find より前）
  if (action === "unequip") {
    if (equipSlot !== null) {
      const item = findItem(player.equipment[equipSlot]);   // 外す前に、名前のためにデータを取っておく
      player.equipment[equipSlot] = null;
      message = `${item?.name ?? "そうび"}をはずした`;
    }
    renderMenu();
    return;
  }
  
  // ここから下は装備に対する処理。id から装備のデータを探す
  const item = ITEMS.find((i) => i.id === id);
  if (!item) {
    return;
  }
  
  // 買う
  if (action === "buy") {
    if (player.gold < item.price) {
      message = "ゴールドが足りない！";
    } else {
      player.gold -= item.price;
      player.ownedItems.push(item.id);   // 持っている装備のリストに足す
      message = `${item.name}を買った`;
    }
  }

  // 装備する（今見ている枠に）
  if (action === "equip" && equipSlot !== null) {
    // ほかの枠についていたら外す（アクセサリーを2つ目の枠に付け替えたとき用）
    for (const slot of SLOTS) {
      if (player.equipment[slot] === item.id) {
        player.equipment[slot] = null;
      }
    }
    player.equipment[equipSlot] = item.id;   // 前の装備は上書きされて外れる
    message = `${item.name}を装備した！`;
  }

  renderMenu();   // 何か変えたら描き直す
}

// =====================================================
// つよさ（仮の振り分け）
// =====================================================

// CURRENT_STAT … 能力の名前 → 今の値を返す関数（対応表）
//   攻撃力・守備力は装備込み（ステータス画面と同じ数字）
//   数字ではなく関数にしているのは、呼ぶたびに最新の値を計算するため
const CURRENT_STAT: Record<StatName, () => number> = {
  attack: getAttack,
  defense: getDefense,
  maxHp: () => player.maxHp,   // 関数がないので、その場で小さな関数を作る
};

// pending … 「けってい」前に、仮に振っている数（能力ごと）
//   「けってい」を押すまで player は変えない。もどれば捨てる
let pending: Record<StatName, number> = { attack: 0, defense: 0, maxHp: 0 };

// resetPending … 仮の振り分けを全部0に戻す
//   使っている場所：けってい後 / 画面を移るとき（タブ・もどる・openMenu）
function resetPending() {
  pending = {attack: 0, defense: 0, maxHp: 0 };
}

// pendingTotal … 仮に振った数の合計
function pendingTotal(): number {
  return pending.attack + pending.defense + pending.maxHp;
}

// remainingPoints … 残りの強化ポイント（持っている数 − 仮に振った数）。見出しの「のこり」
function remainingPoints(): number {
  return player.statPoints - pendingTotal();
}

// changePending … 仮の振り分けを1つ増やす・減らす
//   id   … 能力の id（power / guard / vitality）
//   diff … +1 なら増やす、-1 なら減らす
function changePending(id: string, diff: number) {
  const upgrade = STAT_UPGRADES.find((s) => s.id === id);
  if (!upgrade) {
    return;
  }
  if (diff > 0 && remainingPoints() <= 0) {
    return;   // 残りがないのに増やそうとした
  }
  if (diff < 0 && pending[upgrade.stat] <= 0) {
    return;   // 0なのに減らそうとした
  }
  pending[upgrade.stat] += diff;
}

// =====================================================
// 5つの画面の中身（どれも HTML の文字を返す）
// =====================================================

// statusSection … ステータス画面
function statusSection(): string {

  // rows … [左に出す名前, 右に出す値] の組のリスト。項目を増やすときは1行足すだけ
  const rows: [string, string][] = [
    ["レベル", `${player.level}`],
    ["HP", `${player.hp} / ${player.maxHp}`],
    ["攻撃力", `${getAttack()}`],
    ["守備力", `${getDefense()}`],
    ["次のレベルまで", `${expToNext(player.level) - player.exp}`],
    ["所持金", `${player.gold}G`],
    ["強化ポイント", `${player.statPoints}`],
    ["転生回数", `${player.rebirthCount}`],
    // 8つの枠それぞれの [部位の名前, 装備の名前] を作って、... でここに広げて入れる
    ...SLOTS.map((slot): [string, string] => [SLOT_LABELS[slot], findItem(player.equipment[slot])?.name ?? "なし"]),
  ];

  // ([label, value]) … 組の1つ目を label、2つ目を value という名前で受け取る
  const html = rows.map(([label, value]) => `
    <li class="stat-row"><span>${label}</span><span>${value}</span></li>
  `).join("");

  return `<ul class="item-list">${html}</ul>`;
}

// slotListHtml … そうび画面：8つの部位の一覧
//   行を押すと、その部位の装備の一覧へ（data-slot で押した部位がわかる）
function slotListHtml(): string {
  const rows = SLOTS.map((slot) => {
    const item = findItem(player.equipment[slot]);   // この枠についている装備（なければ undefined）
    return `
      <li class="slot-row" data-slot="${slot}">
        <span class="slot-label">${SLOT_LABELS[slot]}</span>
        <span class="slot-item ${item ? "" : "none"}">${item?.name ?? "そうびなし"}</span>
        <span class="slot-bonus">${item ? bonusText(item) : "-"}</span>
      </li>
    `;
    // slot-label … 部位の名前 / slot-item … 装備の名前（なければ none で薄くする）/ slot-bonus … 効果
  }).join("");

  return `<ul class="slot-list">${rows}</ul>`;
}

// slotItemsHtml … そうび画面：1つの部位の装備の一覧
//   slot … 今見ている枠（equipSection から）
function slotItemsHtml(slot: Slot): string {
  const current = findItem(player.equipment[slot]);   // 今つけている装備
  const currentText = current ? `${current.name} (${bonusText(current)})` : "そうびなし";

  const rows = ITEMS
    .filter((item) => item.type === SLOT_TYPE[slot])   // この枠につけられる種類だけ
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
  // 何もつけていないときは「はずす」を押せなくする（disabled）
}

// equipSection … そうび画面（部位の一覧か、部位ごとの一覧か、を決めるだけ）
function equipSection(): string {
  if (equipSlot === null) {
    return slotListHtml();
  }
  return slotItemsHtml(equipSlot);
}

// statsSection … つよさ画面（「ー 数 ＋」と「けってい」）
function statsSection(): string {
  // map の中で途中の変数を作りたいので { } と return の形にしている
  const rows = STAT_UPGRADES.map((s) => {
    const now = CURRENT_STAT[s.stat]();   // 今の値
    const count = pending[s.stat];        // 仮に振っている数
    // 振っていれば「15 → 17」、振っていなければ「15」
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
    // 「ー」は振った数が0なら押せない / 「＋」は残りが0なら押せない
  }).join("");

  return `
    <h3>強化ポイント (のこり ${remainingPoints()}) </h3>
    <ul class="item-list">${rows}</ul>
    <button id="confirm-stats" class="confirm" ${pendingTotal() === 0 ? "disabled" : ""}>けってい</button>
  `;
  // 何も振っていなければ「けってい」は押せない
}

// rebirthSection … 転生画面
function rebirthSection(): string {
  return `
    <h3>転生 (${player.rebirthCount}回) </h3>
    <p class="status">Lv${REBIRTH_LEVEL}になると転生できます。レベルとゴールドは最初に戻りますが、ずっと強くなります</p>
    <button id="rebirth-button" ${canRebirth() ? "" : "disabled"}>転生する</button>
  `;
}

// dataSection … データ画面
function dataSection(): string {
  return `
    <button id="delete-save" class="danger">データを消す</button>
  `;
}

// SECTIONS … 画面の名前 → その中身を作る関数（対応表）
//   SECTIONS[currentView]() で、今の画面の中身が作られる
const SECTIONS: Record<MenuTab, () => string> = {
  status: statusSection,
  equip: equipSection,
  stats: statsSection,
  rebirth: rebirthSection,
  data: dataSection,
};

// =====================================================
// 画面を描く
// =====================================================

// renderMenu … 今の画面（currentView）を描き直す
//   何かを変えたら、最後にこれを呼ぶ
function renderMenu() {
  if (currentView === "top") {
    renderTop();
  } else {
    renderSection(currentView);   // else に来た時点で currentView は MenuTab（型の絞り込み）
  }
}

// renderTop … メニューの最初の画面（ボタンが2列に並ぶ）
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
  
  // ボタンを押したら、その画面へ
  menuRoot.querySelectorAll<HTMLButtonElement>("[data-tab]").forEach((button) => {
    button.addEventListener("click", () => {
      currentView = button.dataset.tab as MenuTab;   // as MenuTab … 5つのどれかだと伝える
      message = "";
      equipSlot = null;   // そうびは、いつも部位の一覧から
      resetPending();     // つよさの仮の振り分けを捨てる
      renderMenu();
    });
  });
  
  // とじる：フィールドに戻って、フィールドの表示を直してもらう
  menuRoot.querySelector("#close-menu")?.addEventListener("click", () => {
    changeScene("field");
    onClose?.();
  });
}

// renderSection … 5つの画面のどれかを描く（見出し ＋ 中身）と、ボタンをつなぐ
//   tab … 表示する画面
function renderSection(tab: MenuTab) {
  if (!menuRoot) {
    return;
  }

  // 見出し：そうびで部位を見ているときは「そうび : 手袋」のように
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
  // SECTIONS[tab]() … その画面の中身を作る関数を呼ぶ
  // 下のボタンの処理は、その画面にボタンがなければ ?. で何もしない

  // もどる：部位を見ていれば部位の一覧へ、それ以外はメニューの最初へ
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

  // data-action のボタン（買う・装備する・はずす・＋・ー）は、全部 handleItem へ
  menuRoot.querySelectorAll<HTMLButtonElement>("[data-action]").forEach((button) => {
    button.addEventListener("click", () => {
      handleItem(button.dataset.action ?? "", button.dataset.id ?? "");
    });
  });

  // データを消す（確認してから、消して読み込み直す）
  menuRoot.querySelector("#delete-save")?.addEventListener("click", () => {
    if (confirm("本当にデータを消しますか？")) {
      deleteSave();
      location.reload();
    }
  });

  // 転生（確認してから。取り消せない大きな変化なので、すぐ保存する）
  menuRoot.querySelector("#rebirth-button")?.addEventListener("click", () => {
    if (confirm("本当に転生しますか？")) {
      rebirth();
      saveGame();
      message = `転生した！ ${player.rebirthCount}回目の旅がはじまる`;
      renderMenu();
    }
  });

  // つよさの「けってい」
  menuRoot.querySelector("#confirm-stats")?.addEventListener("click", () => {
    confirmUpgrades();
    renderMenu();
  });

  // そうびの部位の行を押したら、その部位の一覧へ
  //   <li> はボタンではないので HTMLElement
  menuRoot.querySelectorAll<HTMLElement>("[data-slot]").forEach((row) => {
    row.addEventListener("click", () => {
      equipSlot = row.dataset.slot as Slot;
      message = "";
      renderMenu();
    });
  });
}

// =====================================================
// 外から呼ばれる関数
// =====================================================

// openMenu … メニューを開く（いつも最初の画面から）
//   closeCallback … 「とじる」を押したときにやること（field.ts から updateFieldStatus が来る）
export function openMenu(closeCallback: () => void) {
  currentView = "top";
  onClose = closeCallback;
  message = "";
  equipSlot = null;
  resetPending();
  renderMenu();
  changeScene("menu");
}

// setupMenu … メニュー画面の入れ物を覚える（main.ts から、ゲームを開いたときに1回）
export function setupMenu(root: HTMLElement) {
  menuRoot = root;
}

// =====================================================
// main.ts
// ゲームのスタート地点。ページを開いたら、まずここが動く
//   （index.html の <script src="/src/main.ts"> から読み込まれる）
//   やること：データを読む → 3つの画面を作る → フィールドを表示 → 自動保存を始める
// =====================================================

// style.css … 画面の見た目。import するだけで Vite がページに読み込んでくれる
// setupField など … 各画面を作る関数（field.ts / battle.ts / menu.ts）
// changeScene … 画面を切り替える（scene.ts）
// loadGame / saveGame / startAutoSave … 読み込み・保存・自動保存（save.ts）
// giveOfflineReward … 離れていた間のごほうびを計算して渡す（offline.ts）
import "./style.css";
import { setupField, updateFieldStatus, showFieldMessage } from "./field";
import { setupBattle } from "./battle";
import { changeScene } from "./scene";
import { setupMenu } from "./menu";
import { loadGame, saveGame, startAutoSave } from "./save";
import { giveOfflineReward } from "./offline";

// hiddenAt … アプリを閉じた（別のアプリに切り替えた）時刻
//   null … 閉じていない、という意味。最初は必ず null にしておく（NaN を防ぐ）
let hiddenAt: number | null = null;

// checkOfflineReward … 離れていた間のごほうびを確かめて、あれば渡す
//   since … いつから離れていたか（時刻のミリ秒）
//   使っている場所：ゲームを開いたとき / アプリに戻ってきたとき
function checkOfflineReward(since: number) {
  const report = giveOfflineReward(since);   // ごほうびのメッセージ（短すぎたら null）
  if (report) {
    saveGame();               // もらったらすぐ保存
    updateFieldStatus();      // 上のHUD（レベル・HP・ゴールド）を直す
    showFieldMessage(report); // 「〇分のあいだに…」を表示
  }
}

// app … index.html の <div id="app">。ゲーム全体の入れ物
const app = document.querySelector<HTMLDivElement>("#app");

if (app) {
  // セーブデータを読み込む。戻り値は最後に保存した時刻（データがなければ null）
  const lastSaveTime = loadGame();

  // 3つの画面の入れ物を作る。id は scene.ts の "{名前}-screen" と合わせている
  app.innerHTML = `
    <div id="field-screen"></div>
    <div id="battle-screen"></div>
    <div id="menu-screen"></div>
  `;

  // 作った入れ物を取ってくる（innerHTML のあとでないと見つからない）
  const fieldScreen = document.getElementById("field-screen");
  const battleScreen = document.getElementById("battle-screen");
  const menuScreen = document.getElementById("menu-screen");

  // 3つとも見つかったら、それぞれの中身を作ってもらう
  if (fieldScreen && battleScreen && menuScreen) {
    setupField(fieldScreen);
    setupBattle(battleScreen);
    setupMenu(menuScreen);
  }

  // 最初はフィールドを表示（ほかの2つは hidden になる）
  changeScene("field");

  // 前に遊んだことがあれば、閉じていた間のごほうび
  if (lastSaveTime !== null) {
    checkOfflineReward(lastSaveTime);
  }

  // 5秒ごとの自動保存を始める
  startAutoSave();

  // visibilitychange … アプリが見えなくなった・また見えたときに動く
  //   ページを閉じずに別のアプリに切り替えたとき用（スマホでよくある）
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") {
      hiddenAt = Date.now();   // 見えなくなった：時刻を覚える
    } else {
      if (hiddenAt !== null) { // 戻ってきた：覚えた時刻からのごほうび
        checkOfflineReward(hiddenAt);
        hiddenAt = null;       // 使ったら空に戻す（二重にもらわないように）
      }
    }
  });
}

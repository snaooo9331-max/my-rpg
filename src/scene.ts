// =====================================================
// scene.ts
// 画面（フィールド・戦闘・メニュー）の切り替え
//   使っている場所：main.ts / field.ts / battle.ts / menu.ts
// =====================================================

// Scene … 画面の名前。この3つ以外は書けない
export type Scene = "field" | "battle" | "menu";

// SCENES … 全部の画面のリスト（切り替えるとき、全部を順番に見るため）
const SCENES: Scene[] = ["field", "battle", "menu"];

// currentScene … 今表示している画面
let currentScene: Scene = "field";

// getScene … 今どの画面かを教える
//   currentScene を直接 export せず関数にしているのは、外から勝手に書き換えられないようにするため
//   使っている場所：field.ts（フィールド以外の画面ではキーやスワイプで歩かないように）
export function getScene(): Scene {
  return currentScene;
}

// changeScene … 画面を切り替える
//   next … 次に表示する画面
export function changeScene(next: Scene) {
  currentScene = next;
  SCENES.forEach((scene) => {
    // scene + "-screen" … "field-screen" などの id（main.ts で作った入れ物）
    // toggle("hidden", 条件) … 条件が true なら hidden を付ける、false なら外す
    //   → next 以外の画面は隠れて、next だけが表示される
    document.getElementById(scene + "-screen")?.classList.toggle("hidden", scene !== next);
  });
}

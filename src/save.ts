// =====================================================
// save.ts
// セーブ（保存）・ロード（読み込み）・データ削除をまとめたファイル
//   保存先は localStorage（ブラウザの中の保存場所。端末・ブラウザ・URLごとに別）
//   使っている場所：main.ts（起動時の読み込み、自動セーブ）/ menu.ts（データを消す、転生後の保存）
// =====================================================

// player         … 勇者のデータ本体（これをまるごと保存する）
// emptyEquipment … 何もつけていない装備の対応表を作る（古いセーブの引き継ぎで使う）
// Character      … 勇者のデータの型
import { player, emptyEquipment, type Character } from "./player";

// SAVE_KEY … localStorage に保存するときの名前（開発者ツールの Local Storage でこの名前が見える）
const SAVE_KEY = "myRpgSave";

// saveEnabled … 保存してよいか
//   false になるのは：データを消したとき / 読み込みに失敗したとき
//   （失敗したまま保存すると、古いデータを最初からのデータで上書きしてしまうため）
let saveEnabled = true;

// SaveData … 保存するデータの形
type SaveData = {
  player: Character;      // 勇者のデータまるごと
  lastSaveTime: number;   // 保存した時刻（放置報酬の計算に使う）
};

// -----------------------------------------------------
// saveGame … 今の状態を保存する
//   使っている場所：startAutoSave（5秒ごと・閉じたとき）/ main.ts（放置報酬のあと）/ menu.ts（転生のあと）
// -----------------------------------------------------
export function saveGame() {
  if (!saveEnabled) {
    return;   // 保存しない状態なら何もしない
  }
  const data: SaveData = {
    player: player,
    lastSaveTime: Date.now(),   // 今の時刻
  };
  try {
    // JSON.stringify … データを文字に変える（localStorage は文字しか保存できない）
    localStorage.setItem(SAVE_KEY, JSON.stringify(data));
  } catch {
    // プライベートブラウズなど、保存できない環境では何もしない（ゲームは止めない）
  }
}

// -----------------------------------------------------
// loadGame … 保存したデータを読み込んで player に入れる
//   戻り値 … 前回保存した時刻。セーブがない・失敗したら null
//   使っている場所：main.ts（ゲームを開いたとき、一番最初）
// -----------------------------------------------------
export function loadGame(): number | null {
  try {
    // saved … localStorage から取り出した「文字」。なければ null（初めて遊ぶとき）
    const saved = localStorage.getItem(SAVE_KEY);
    if (saved === null) {
      return null;
    }
    // data … 文字を JSON.parse で「データ」に戻したもの
    const data = JSON.parse(saved) as SaveData;

    // savedPlayer … 保存されていた勇者のデータ
    //   Partial<Character> … Character の項目が「あるかもしれない」（古いセーブには足りない項目がある）
    //   & { … } … 昔の名前の項目も「あるかもしれない」（? はあってもなくてもいい印）
    const savedPlayer = data.player as Partial<Character> & {
      skillPoints?: number;        // 昔の「スキルポイント」（今は statPoints）
      weapon?: string | null;      // 昔の武器（今は equipment.weapon）
      armor?: string | null;       // 昔の防具（今は equipment.body）
    };

    // 昔の skillPoints があれば、statPoints に移す
    if (savedPlayer.skillPoints !== undefined) {
      savedPlayer.statPoints ??= savedPlayer.skillPoints;   // ??= … 左が空なら右を入れる
      delete savedPlayer.skillPoints;                         // 古い名前の項目は消す
    }

    // 装備の対応表を、8つの枠がそろった形にする
    //   ... … 中身をここに広げて入れる。後ろに書いたものが前のものを上書きする
    savedPlayer.equipment = {
      ...emptyEquipment(),                    // ① まず全部の枠を「つけていない」に
      weapon: savedPlayer.weapon ?? null,     // ② 昔の武器を武器の枠へ
      body: savedPlayer.armor ?? null,        // ② 昔の防具を服の枠へ
      ...savedPlayer.equipment,               // ③ 新しい形で保存されていれば、それで上書き
    };
    delete savedPlayer.weapon;
    delete savedPlayer.armor;

    // スキルポイントがまだないセーブ（この機能を作る前のデータ）なら、
    //   今までのレベルアップの分をまとめて渡す（Lv8 なら 7 ポイント）
    //   ??= … 左が空（undefined）のときだけ右を入れる。もう持っていれば何もしない
    savedPlayer.skillPt ??= (savedPlayer.level ?? 1) - 1;
    
    // Object.assign … savedPlayer にある項目だけを player に上書きコピーする
    //   保存されていない項目（新しく足した項目）は、player.ts の初期値のまま残る
    Object.assign(player, savedPlayer);

    // 保険：ゴールドや経験値が壊れていたら（NaN など）0 に直す
    //   typeof … 値の種類を調べる（数字なら "number"）
    //   Number.isNaN … NaN（数字ではない数字）かどうか
    if (typeof player.gold !== "number" || Number.isNaN(player.gold)) {
      player.gold = 0;
    }
    if (typeof player.exp !== "number" || Number.isNaN(player.exp)) {
      player.exp = 0;
    }
    return data.lastSaveTime ?? null;
  } catch (error) {
    // 読み込みに失敗したとき（データが壊れている、コードにバグがある など）
    console.error("セーブデータの読み込みに失敗しました", error);   // 開発者ツールに原因を出す
    saveEnabled = false;   // 古いデータを上書きしないように、保存を止める
    return null;           // 最初から始める
  }
}

// -----------------------------------------------------
// deleteSave … 保存データを消す
//   使っている場所：menu.ts の「データを消す」（このあと location.reload() で読み込み直す）
// -----------------------------------------------------
export function deleteSave() {
  saveEnabled = false;   // 読み込み直すまでの間に自動セーブで復活しないように止める
  try {
    localStorage.removeItem(SAVE_KEY);
  } catch {
    // 消せない環境でも何もしない
  }
}

// -----------------------------------------------------
// startAutoSave … 自動セーブを始める
//   使っている場所：main.ts（起動の最後に1回だけ呼ぶ）
// -----------------------------------------------------
export function startAutoSave() {
  setInterval(saveGame, 5000);   // 5秒ごとに保存（saveGame に () を付けない＝関数そのものを渡す）
  // visibilitychange … 画面の見え方が変わったとき（スマホでホームに戻る、タブを切り替える など）
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") {
      saveGame();   // 見えなくなった瞬間に保存（閉じる直前の進み具合を逃さない）
    }
  });
}

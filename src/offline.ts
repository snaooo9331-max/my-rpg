// =====================================================
// offline.ts
// 放置報酬（ゲームを閉じていた間にもらえる経験値とゴールド）の計算
//   使っている場所：main.ts の checkOfflineReward
//     ・ゲームを開いたとき（前回保存した時刻から）
//     ・スマホでホームに戻って、また開いたとき（閉じた時刻から）
// =====================================================

// player    … 勇者のデータ（ゴールドを足す、レベルを見る）
// gainExp   … 経験値を渡してレベルアップさせる（バトルと同じ関数）
// getAttack … 装備込みの攻撃力（放置報酬の計算に使う）
import { player, gainExp, getAttack } from "./player";

// -----------------------------------------------------
// 調整用の数字（バランスを変えたいときはここだけ触る）
//   MS は「ミリ秒」。1000ミリ秒 ＝ 1秒
// -----------------------------------------------------
const MIN_OFFLINE_MS = 60 * 1000;          // 1分未満なら報酬なし（再読み込み連打の抜け道を防ぐ）
const MAX_OFFLINE_MS = 8 * 60 * 60 * 1000; // 8時間より長く閉じていても、8時間分まで
const EXP_RATE = 20;                       // 小さくするほど経験値が増える
const GOLD_RATE = 2;                       // 小さくするほどゴールドが増える

// -----------------------------------------------------
// giveOfflineReward … 放置報酬を計算して、勇者に渡す
//   lastSaveTime … 数え始める時刻（Date.now() と同じ「1970年からのミリ秒」）
//   戻り値 … 「おかえりなさい！…」のメッセージ。報酬がなければ null
// -----------------------------------------------------
export function giveOfflineReward(lastSaveTime: number): string | null {
  // elapsed … 閉じていた時間（ミリ秒）。Math.min で8時間を超えないようにする
  const elapsed = Math.min(Date.now() - lastSaveTime, MAX_OFFLINE_MS);
  if (elapsed < MIN_OFFLINE_MS) {
    return null;   // 1分未満は報酬なし
  }

  const minutes = elapsed / 60000;                                   // ミリ秒 → 分
  const exp = Math.floor((minutes * getAttack()) /EXP_RATE);        // 経験値 ＝ 分 × 攻撃力 ÷ 20（切り捨て）
  const gold = Math.floor((minutes * player.level) / GOLD_RATE);    // ゴールド ＝ 分 × レベル ÷ 2（切り捨て）

  if (exp === 0 && gold === 0) {
    return null;   // 短い時間だと両方0になる。そのときはメッセージを出さない
  }

  player.gold += gold;
  const levelUps = gainExp(exp);   // レベルアップのメッセージのリスト（上がらなければ空）

  // text … 画面の下に出すメッセージ。let なのは、あとで付け足すことがあるから
  let text = `おかえりなさい！ ${Math.floor(minutes)}分の間に${exp}の経験値と${gold}Gを手に入れた！`;
  if (levelUps.length > 0) {
    text += ` レベルが${player.level}に上がった！`;   // += … 文字の後ろに付け足す
  }
  return text;
}

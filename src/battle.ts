// =====================================================
// battle.ts
// バトル画面：ターンの流れ（勇者の攻撃 → 敵の攻撃）、勝ち・負け・にげる、オート戦闘
//   使っている場所：main.ts（setupBattle）/ field.ts（startBattle）
//   バトルは「勝った・にげた・負けた」を知らせるだけ。そのあとどうするかは field.ts が決める
// =====================================================

// changeScene … 画面を切り替える（バトル → フィールドに戻るとき）（scene.ts）
// player      … 勇者のデータ（HP・名前・ゴールド）（player.ts）
// gainExp     … 経験値を渡してレベルアップさせる（player.ts）
// getAttack / getDefense … 装備込みの攻撃力・守備力（player.ts）
// MONSTERS    … モンスターの一覧（monster.ts）
// MonsterData … モンスター1種類分のデータの型（monster.ts）
// setTextById / setBar … 文字やバーを書き換える共通の部品（ui.ts）
import { changeScene } from "./scene";
import { player, gainExp, getAttack, getDefense} from "./player";
import { MONSTERS, type MonsterData } from "./monster";
import { setTextById, setBar } from "./ui";

// -----------------------------------------------------
// BattleOptions … startBattle に渡すもの（field.ts の checkEncounter から来る）
//   () => void … 「引数なしで、何も返さない関数」の型
// -----------------------------------------------------
type BattleOptions = {
  monsterId: string;      // どのモンスターと戦うか（MONSTERS のキー）
  onWin: () => void;      // 勝ったときにやること（敵を隠す、復活を予約…）
  onEscape: () => void;   // にげたときにやること（1歩前に戻る）
  onLose: () => void;     // 負けたときにやること（スタート地点へ、HP全回復）
}

// -----------------------------------------------------
// バトル中に覚えておくもの
// -----------------------------------------------------
let battleRoot: HTMLElement | null = null;   // バトル画面の入れ物（setupBattle でもらう）
let options: BattleOptions | null = null;    // 今のバトルの BattleOptions（勝った・負けたときに呼ぶ）
let enemy: MonsterData = MONSTERS.mushroom;  // 今戦っている敵のデータ（最初は仮にキノコ）
let enemyHp = 0;        // 敵の今のHP（敵のデータとは別に、バトルごとに減らしていく）
let busy = false;       // true の間は「攻撃中・待ち時間中」。ボタン連打を受け付けない
let autoMode = false;   // オートが ON か。バトルが終わっても覚えている（次のバトルもオートのまま）
let inBattle = false;   // 今バトル中か。勝ち・負け・にげるが決まった瞬間に false（オートを止めるため）

// -----------------------------------------------------
// wait … 指定した時間待つ
//   ms … 待つ時間（ミリ秒）
//   Promise … 「あとで終わる約束」。await wait(800) と書くと、0.8秒待ってから次の行へ進む
// -----------------------------------------------------
function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// -----------------------------------------------------
// calcDamage … ダメージを計算する
//   attack … 攻撃する側の攻撃力 / defense … 受ける側の守備力
//   攻撃力 − 守備力 に −1・0・+1 のどれかを足す。どんなに守備力が高くても最低1
// -----------------------------------------------------
function calcDamage(attack: number, defense: number): number {
  const random = Math.floor(Math.random() * 3) - 1;   // -1 / 0 / 1 のどれか
  return Math.max(1, attack - defense + random);      // Math.max で 1 より小さくならないようにする
}

// =====================================================
// オート戦闘
// =====================================================

// scheduleAuto … オートが ON なら、少し待ってから自動で攻撃する
//   使っている場所：startBattle（バトル開始）/ ターンの終わり / toggleAuto（ON にしたとき）
async function scheduleAuto() {
  if (!autoMode) {
    return;
  }
  await wait(600);
  // 待っている間に状況が変わったかもしれないので、もう一度確かめる
  if (autoMode && inBattle && !busy) {
    attack();   // 手で「たたかう」を押したときと同じ処理
  }
}

// updateAutoButton … オートボタンの文字と色を、今の状態に合わせる
function updateAutoButton() {
  const button = battleRoot?.querySelector("#auto-button");
  if (button) {
    button.textContent = autoMode ? "オート：ON" : "オート：OFF";
    button.classList.toggle("auto-on", autoMode);   // ON のときだけ auto-on（緑）を付ける
  }
}

// toggleAuto … オートの ON / OFF を切り替える（オートボタンを押したとき）
function toggleAuto() {
  autoMode = !autoMode;   // ! … 反対にする（true ⇔ false）
  updateAutoButton();
  scheduleAuto();         // ON にしたら、すぐ攻撃を予約する
}

// =====================================================
// 画面の表示
// =====================================================

// updateStatus … 勇者と敵の HP・レベルの表示を、今の値で描き直す
//   使っている場所：攻撃のたび / バトル開始 / レベルアップのとき
function updateStatus() {
  setTextById("battle-enemy-name", enemy.name);
  setTextById("battle-player-level", `Lv${player.level}`);
  setTextById("battle-player-hp", `${player.hp} / ${player.maxHp}`);
  setTextById("battle-enemy-hp", `${enemyHp} / ${enemy.maxHp}`);

  const enemyPercent = (enemyHp / enemy.maxHp) * 100;      // 敵のHPの残りの割合（0〜100）
  const playerPercent = (player.hp / player.maxHp) * 100;  // 勇者のHPの残りの割合（0〜100）

  setBar("battle-enemy-hp-fill", enemyPercent);
  setBar("battle-player-hp-fill", playerPercent);
  document.getElementById("battle-player-hp-fill")?.classList.toggle("low", playerPercent <= 30);   // 30%以下で赤
}

// =====================================================
// バトルの流れ
// =====================================================

// startBattle … バトルを始める
//   BattleOptions … どのモンスターか、勝った・にげた・負けたときにやること（field.ts から）
//   ※ 引数の名前が型の名前（BattleOptions）と同じなので、battleOptions など小文字にすると読みやすい
export function startBattle(battleOptions: BattleOptions) {
  options = battleOptions;                                              // あとで onWin などを呼ぶために覚えておく
  enemy = MONSTERS[battleOptions.monsterId] ?? MONSTERS.mushroom;       // 見つからなければキノコ（保険）
  enemyHp = enemy.maxHp;                                                // 敵はHP満タンで登場
  busy = false;
  inBattle = true;

  // 敵の画像を、そのモンスターの画像にする
  const image = battleRoot?.querySelector<HTMLImageElement>("#battle-enemy-image");
  if (image) {
    image.src = "assets/" + enemy.image + ".png";
  }

  updateStatus();
  setTextById("battle-log", `${enemy.name}があらわれた！`);
  changeScene("battle");
  scheduleAuto();   // オートが ON なら、すぐ攻撃を始める
}

// enemyTurn … 敵の攻撃
//   戻り値 … 勇者が生き残ったら true、倒れたら false
//   async 関数の戻り値は Promise<…> で包まれる（ここでは Promise<boolean>）
//   使っている場所：attack（敵が生き残ったとき）/ run（にげられなかったとき）
async function enemyTurn(): Promise<boolean> {
  await wait(800);
  const damage = calcDamage(enemy.attack, getDefense());   // 敵の攻撃力 vs 勇者の守備力（装備込み）
  player.hp = Math.max(0, player.hp - damage);             // HP は 0 より下げない
  setTextById("battle-log", `${enemy.name}のこうげき！ ${player.name}は ${damage}のダメージをうけた！`);
  updateStatus();

  // 勇者が倒れたとき
  if (player.hp <= 0) {
    inBattle = false;   // オートが動き続けないように、すぐ止める
    await wait(1000);
    setTextById("battle-log", `${player.name}はたおれてしまった...`);
    await wait(1500);
    options?.onLose();   // 負けたときの処理（field.ts が渡したもの）。?. … options があれば呼ぶ
    changeScene("field");
    return false;
  }
  return true;
}

// attack … 勇者の攻撃（「たたかう」ボタン / オート）
//   敵を倒したら報酬をもらって onWin、倒せなければ敵のターンへ
async function attack() {
  if (busy) {
    return;   // 攻撃中・待ち時間中は受け付けない（連打対策）
  }
  busy = true;

  const damage = calcDamage(getAttack(), enemy.defense);   // 勇者の攻撃力（装備込み）vs 敵の守備力
  enemyHp = Math.max(0, enemyHp - damage);
  setTextById("battle-log", `${player.name}のこうげき！ ${enemy.name}に${damage}のダメージ！`);
  updateStatus();

  // 敵を倒したとき
  if ( enemyHp <= 0) {
    inBattle = false;
    await wait(1000);
    setTextById("battle-log", `${enemy.name}をたおした！`);
    await wait(1000);

    // 報酬：ゴールドと経験値（モンスターのデータから）
    player.gold += enemy.gold;
    setTextById("battle-log", `${enemy.exp} のけいけんちと ${enemy.gold} ゴールドをてにいれた！`);
    const levelUps = gainExp(enemy.exp);   // レベルアップのメッセージのリスト（上がらなければ空）
    for (const message of levelUps) {      // for…of … リストの中身を1つずつ取り出す
      await wait(1200);
      setTextById("battle-log", message);
      updateStatus();
    }
    await wait(1200);
    options?.onWin();      // 勝ったときの処理（field.ts が渡したもの）
    changeScene("field");
    return;
  }

  // 敵が生きていれば敵のターン。勇者が生き残ったら、また操作できるようにする
  if (await enemyTurn()) {
    busy = false;
    scheduleAuto();   // オートなら次の攻撃を予約
  }
}

// run … にげる（50%で成功）
async function run() {
  if (busy) {
    return;
  }
  busy = true;

  // Math.random() < 0.5 … 50%の確率で true → にげられなかった
  if (Math.random() < 0.5) {
    setTextById("battle-log", "にげられなかった！");
    if (await enemyTurn()) {   // 失敗したら敵に攻撃される
      busy = false;
      scheduleAuto();
    }
    return;
  }

  // にげるのに成功
  inBattle = false;
  setTextById("battle-log", "うまくにげきれた！");
  await wait(800);
  options?.onEscape();   // にげたときの処理（field.ts が渡したもの）
  changeScene("field");
}

// =====================================================
// バトル画面を作る
// =====================================================

// setupBattle … バトル画面を作り、ボタンをつなぐ（ゲームを開いたときに1回だけ）
//   root … バトル画面の入れ物（main.ts の battle-screen）
export function setupBattle(root: HTMLElement) {
  battleRoot = root;   // あとで画像やオートボタンを探すために覚えておく

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
  // battle-player … 上：勇者のLvとHP
  // battle-stage  … 真ん中：敵の画像と名前・HP
  // battle-log    … メッセージ（「〇〇のこうげき！」など）
  // commands      … 下：たたかう・にげる・オート
  //   id の頭に battle- を付けているのは、フィールドの id とぶつからないようにするため

  // ボタンと関数をつなぐ（関数名に () を付けない＝「押されたらこの関数を呼んで」と渡す）
  root.querySelector("#attack-button")?.addEventListener("click", attack);
  root.querySelector("#run-button")?.addEventListener("click", run);
  root.querySelector("#auto-button")?.addEventListener("click", toggleAuto);
  updateAutoButton();   // 最初の表示（オート：OFF）
}

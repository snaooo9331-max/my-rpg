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
// learnedSkills … 今のレベルで覚えているスキル（skills.ts）
// type SkillData … スキル1つ分のデータの型（chooseAutoSkill の戻り値に使う） 
import { changeScene } from "./scene";
import { player, gainExp, getAttack, getDefense} from "./player";
import { MONSTERS, type MonsterData } from "./monster";
import { setTextById, setBar } from "./ui";
import { learnedSkills, findSkill, type SkillData } from "./skills";

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
// cooldowns … スキルの id → あと何ターン待つか（対応表）
//   例：{ strongSlash: 2 } … つよぎりはあと2ターン使えない
//   書いていないスキルは 0（すぐに使える）として扱う
let cooldowns: Record<string, number> = {};

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

// chooseAutoSkill … オートで使うスキルを選ぶ
// 使えるスキルがなければundefined（そのときは、普通に「たたかう」）
function chooseAutoSkill(): SkillData | undefined {
  //ready ... 覚えていて、今すぐ使える（待ち時間が0の）スキルだけ
  const ready = learnedSkills().filter((s) => (cooldowns[s.id] ?? 0) === 0);

  // hpLow ... HPが最大HPの半分以下か（true / false)
  const hpLow = player.hp <= (player.maxHp / 2);

  // 回復スキルは、HPが減っている時だけ
  const heal = ready.find((s) => s.type === "heal");
  if ( heal && hpLow) {
    return heal;
  }

  // 攻撃スキル（なければundefindが返る）
  return ready.find((s) => s.type === "attack");
}

// scheduleAuto … オートが ON なら、少し待ってから自動で攻撃する
//   使っている場所：startBattle（バトル開始）/ ターンの終わり / toggleAuto（ON にしたとき）
async function scheduleAuto() {
  if (!autoMode) {
    return;
  }
  await wait(600);
  // 待っている間に状況が変わったかもしれないので、もう一度確かめる
  if (autoMode && inBattle && !busy) {
    const skill = chooseAutoSkill();     // 使うスキル（なければundefined）
    if (skill) {
      useSkill(skill.id);                // スキルを使う
    } else {
      attack();                          // 使えるスキルがなければ、普通に攻撃
    }
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

// tickCooldowns … 全部のスキルの待ち時間を1つ減らす（0より下にはしない）
//   使っている場所：nextTurn（勇者のターンが来たとき）
function tickCooldowns() {
  for (const skill of learnedSkills()) {
    cooldowns[skill.id] = Math.max(0, (cooldowns[skill.id] ?? 0) - 1);
  }
}

// =====================================================
// 下のコマンド（3つの段階を切り替える）
// =====================================================

// CommandMode … コマンドの今の段階
//   main   … たたかう・にげる・オート（ターンのはじめ）
//   fight  … こうげき・スキル・もどる（「たたかう」を押したあと）
//   skills … スキルの一覧（「スキル」を押したあと）
type CommandMode = "main" | "fight" | "skills";

// commandMode … 今どの段階を表示しているか
let commandMode: CommandMode = "main";
let logBeforeInfo: string | null = null;

// showCommands … 段階を変えて、描き直す
//   使っている場所：handleCommand（もどる など）/ nextTurn / startBattle / attack / useSkill
function showCommands(mode: CommandMode) {
  commandMode = mode;
  // 説明を出していたら、前のメッセージに戻す
  if (logBeforeInfo !== null) {
    setTextById("battle-log", logBeforeInfo);
    logBeforeInfo = null;    // 戻したので空にする
  }
  renderCommands();
}

// mainCommandsHtml … main の段階のボタン
//   data-cmd … 押したときに何をするか（handleCommand で見分ける）
//   オートのボタンは、updateAutoButton が探せるように id="auto-button" を残す
function mainCommandsHtml(): string {
  return `
    <div class="commands">
      <button data-cmd="fight">たたかう</button>
      <button data-cmd="run">にげる</button>
      <button id="auto-button" data-cmd="auto">オート:OFF</button>
    </div>
  `;
}

// fightCommandsHtml … fight の段階のボタン
//   data-cmd="main" … もどるを押したら main の段階へ
function fightCommandsHtml(): string {
  return `
    <div class="commands">
      <button data-cmd="attack">こうげき</button>
      <button data-cmd="skills" ${learnedSkills().length === 0 ? "disabled" : ""}>スキル</button>
      <button data-cmd="main" class="back">もどる</button>
    </div>
  `;
}

// skillCommandsHtml … skills の段階：覚えているスキルを2列で並べる
//   1つのマス（skill-cell）に、スキルのボタンと「i」のボタンを横に並べる
function skillCommandsHtml(): string {
  const cells = learnedSkills().map((s) => {
    const cd = cooldowns[s.id] ?? 0;           // あと何ターン待つか
    return `
      <div class="skill-cell">
        <button class="skill-button" data-skill="${[s.id]}" ${cd > 0 ? "disabled" : ""}>
        ${s.name}
        ${cd > 0 ? `<span class="skill-wait">あと${cd}ターン</span>` : ""}
        </button>
        <button class="skill-info" data-info="${s.id}" aria-label="${s.name}の説明">i</button>   
      </div>
    `;    // aria-label … 画面の読み上げ機能が「つよぎりの説明」と読むための名前（見た目は変わらない）
  }).join("");

  return `
    <div class="skill-grid">
      ${cells}
      <button data-cmd="fight" class="back wide">もどる</button>
    </div>
  `;
  // もどる ... fightの段階へ。wideで2列ぶち抜きの横いっぱいにする
}

// COMMAND_HTML … 段階の名前 → そのボタンを作る関数（対応表）
//   menu.ts の SECTIONS と同じ形
const COMMAND_HTML: Record<CommandMode, () => string> = {
  main: mainCommandsHtml,
  fight: fightCommandsHtml,
  skills: skillCommandsHtml,
};

// renderCommands … 今の段階のボタンを描いて、押したときの処理をつなぐ
function renderCommands() {
  const area = battleRoot?.querySelector("#commands");
  if (!area) {
    return;
  }
  area.innerHTML = COMMAND_HTML[commandMode]();
  updateAutoButton();    //mainのとき、オートのボタンの文字と色を今の状態にあわせる（ほかの段階では何もしない）

  // data-cmdのボタン（たたかう・にげる・オート・こうげき・スキル・もどる）は全部handleCommandへ
  area.querySelectorAll<HTMLButtonElement>("[data-cmd]").forEach((button) => {
    button.addEventListener("click", () => {
      handleCommand(button.dataset.cmd ?? "");
    });
  });

  // スキルのボタン（前のrenderSkillButtonsと同じ）
  area.querySelectorAll<HTMLButtonElement>("[data-skill]").forEach((button) => {
    button.addEventListener("click", () => {
      useSkill(button.dataset.skill ?? "");
    });
  });

  // 「i」のボタン：メッセージ欄に説明を出すだけ（ターンは進まない）
  area.querySelectorAll<HTMLButtonElement>("[data-info]").forEach((button) => {
    button.addEventListener("click", () => {
      const skill = findSkill(button.dataset.info ?? "");
      if (skill) {
        // まだ覚えていなければ、今のメッセージを覚えておく
        //   「i」を2回押したときに、説明の文を覚えてしまわないように、null のときだけ
        if (logBeforeInfo === null) {
          logBeforeInfo = document.getElementById("battle-log")?.textContent ?? "";
        }
        setTextById("battle-log", `${skill.name}：${skill.description}`);
      }
    });
  });
}

// handleCommand … data-cmd のボタンを押したときの分かれ道
//   cmd … ボタンの data-cmd の値
function handleCommand(cmd: string) {
  // オートは、行動中（busy）でも切り替えられるようにする
  if (cmd === "auto") {
    toggleAuto();
    return;
  }
  if (busy) {
    return;       // 行動中・敵のターン中は受け付けない
  }
  if (cmd === "attack") {
    attack();
  } else if (cmd === "run") {
    run();
  } else if (cmd === "main" || cmd === "fight" || cmd === "skills") {
    showCommands(cmd);      // ここに来たcmdは3つのどれかなのでCommandModeとして渡せる（型の絞り込み）
  }
}

// nextTurn … 敵のターンが終わって、勇者のターンが来たときにやること
//   今までは attack と run の両方に同じ2行が書いてあったので、1つにまとめる
function nextTurn() {
  tickCooldowns();          //待ち時間を1つ減らす
  showCommands("main");     //ボタンの(2)などを更新
  busy = false;             
  scheduleAuto();
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
  cooldowns = {};              // 戦闘のはじめは、全部すぐに使える
  showCommands("main");        // 今のレベルで覚えているスキルのボタンを出す

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

// winBattle … 敵をたおしたあとの処理（ごほうび → レベルアップ → フィールドへ）
//   使っている場所：attack（たたかう）/ useSkill（スキル）
//   もともと attack の中にあったものを、そのまま移した
async function winBattle() {
  inBattle = false;
  await wait(1000);
  setTextById("battle-log", `${enemy.name}をたおした！`);
  await wait(1000);

  player.gold += enemy.gold;
  setTextById("battle-log", `${enemy.exp}の経験値と${enemy.gold}ゴールドを手に入れた！`);
  const levelUps = gainExp(enemy.exp);
  for (const message of levelUps) {
    await wait(1200);
    setTextById("battle-log", message);
    updateStatus();
  }
  await wait(1200);
  options?.onWin();
  changeScene("field");
}

// attack … 勇者の攻撃（「たたかう」ボタン / オート）
//   敵を倒したら報酬をもらって onWin、倒せなければ敵のターンへ
async function attack() {
  if (busy) {
    return;   // 攻撃中・待ち時間中は受け付けない（連打対策）
  }
  busy = true;
  showCommands("main");     // こうげきを選んだら、コマンドを最初の段階に戻す

  const damage = calcDamage(getAttack(), enemy.defense);   // 勇者の攻撃力（装備込み）vs 敵の守備力
  enemyHp = Math.max(0, enemyHp - damage);
  setTextById("battle-log", `${player.name}のこうげき！ ${enemy.name}に${damage}のダメージ！`);
  updateStatus();

  // 敵を倒したとき
  if ( enemyHp <= 0) {
    await winBattle();     // await ...倒した処理が全部終わるまで待つ
    return;
  }

  // 敵が生きていれば敵のターン。勇者が生き残ったら、また操作できるようにする
  if (await enemyTurn()) {
    nextTurn();
  }
}

// useSkill … スキルを使う（スキルのボタンを押したとき）
//   id … 使うスキルの id（ボタンの data-skill から）
//   流れは attack と同じ：自分の行動 → たおしたか確かめる → 敵のターン → 次のターン
async function useSkill(id: string) {
  if (busy) {
    return;           // 攻撃中、待ち時間中は受け付けない
  }
  const skill = findSkill(id);
  if (!skill || (cooldowns[skill.id] ?? 0) > 0) {
    return;           // 見つからない、またはまだ使えない
  }
  busy = true;

  cooldowns[skill.id] = skill.cooldown;       // 使ったので、待ち時間をセット
  showCommands("main");                       // ボタンをすぐ「つよぎり（３）にする

  if (skill.type === "attack") {const power = Math.floor(getAttack() * skill.power);
    // 攻撃スキル：攻撃力を power 倍にしてからダメージを計算
    
    const damage = calcDamage(power, enemy.defense);
    enemyHp = Math.max(0, enemyHp - damage);
    setTextById("battle-log", `${player.name}の${skill.name}！ ${enemy.name}に${damage}のダメージ！`);
  } else {
    // 回復スキル：最大HPのpower%回復する。（４０なら４０％）
    const amount = Math.floor((player.maxHp * skill.power) / 100);
    const before = player.hp;            // 回復する前のHP（どれだけ回復したか出すため）
    player.hp = Math.min(player.maxHp, before + amount);
    setTextById("battle-log", `${player.name}の${skill.name}！ HPが${player.hp - before}回復した！`);
  }
  updateStatus();

  if (enemyHp <= 0) {
    await winBattle();
    return;
  }

  if (await enemyTurn()) {
    nextTurn();
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
      nextTurn();
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
    <div id="commands" class="window"></div>
  `;
  // battle-player … 上：勇者のLvとHP
  // battle-stage  … 真ん中：敵の画像と名前・HP
  // battle-log    … メッセージ（「〇〇のこうげき！」など）
  // commands      … 下：たたかう・にげる・オート
  //   id の頭に battle- を付けているのは、フィールドの id とぶつからないようにするため

  renderCommands();       //最初のコマンド（たたかう・にげる・オート）を出す
}

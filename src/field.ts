// =====================================================
// field.ts
// フィールド画面：マップの表示、勇者の移動・向き、カメラ、スワイプ、
//                 敵とのエンカウント、敵の復活、上部のステータス表示
//   使っている場所：main.ts（setupField / updateFieldStatus / showFieldMessage）
// =====================================================

// getScene      … 今どの画面か（バトル中やメニュー中は勇者を動かさないため）（scene.ts）
// MAP_WIDTH / MAP_HEIGHT … マップの横・縦のマス数（map.ts）
// getTile       … そのマスの種類（grass / tree / water / path）（map.ts）
// isWalkable    … そのマスを歩けるか（map.ts）
// startBattle   … バトルを始める（battle.ts）
// player        … 勇者のデータ（位置 x・y もここにある）（player.ts）
// expToNext     … 次のレベルまでに必要な経験値（player.ts）
// START_X / START_Y … スタート地点（負けたら戻る）（player.ts）
// MONSTERS      … モンスターの一覧（マップに置く敵の絵に使う）（monster.ts）
// openMenu      … メニュー画面を開く（menu.ts）
// clamp / setTextById / setBar … 共通の部品（ui.ts）
import { getScene } from "./scene";
import { MAP_WIDTH, MAP_HEIGHT, getTile, isWalkable } from "./map";
import { startBattle } from "./battle";
import { player, expToNext, START_X, START_Y } from "./player";
import { MONSTERS } from "./monster";
import { openMenu } from "./menu";
import { clamp, setTextById, setBar } from "./ui";

// =====================================================
// 1マスの大きさ
// =====================================================

// chooseTileSize … 画面の大きさから、1マスを何pxにするか決める
//   ドット絵は16px。2倍・3倍・4倍のどれかにすると、ドットがきれいにそろう
function chooseTileSize(): number {
  const shortSide = Math.min(window.innerWidth, window.innerHeight);   // 画面の短いほうの辺（px）
  const scale = clamp(Math.floor(shortSide / 128), 2, 4);             // 倍率。128 ＝ 16px × 8マス。2〜4に収める
  return 16 * scale;                                                  // 32px / 48px / 64px のどれか
}

// TILE_SIZE … 1マスの大きさ（px）。ゲームを開いたときに1回だけ決める
const TILE_SIZE = chooseTileSize();

// =====================================================
// スワイプで歩く（スマホ）
// =====================================================

const SWIPE_THRESHOLD = 24;      // 指がこれ以上（px）動いたら「スワイプした」とみなす
const WALK_INTERVAL_MS = 180;    // 歩き続けるときの1歩の間隔（ミリ秒）。小さいほど速く歩く

let touchStartX = 0;                        // 指を置いた場所（横）
let touchStartY = 0;                        // 指を置いた場所（縦）
let touchDirection: string | null = null;   // 今スワイプで歩いている向き。歩いていなければ null
let walkTimer: number | null = null;        // 歩き続けるタイマーの番号（止めるときに使う）。なければ null

// =====================================================
// 向きと操作の対応表
// =====================================================

// DIRECTIONS … 向き → [横にいくつ, 縦にいくつ] 動くか
//   画面は下に行くほど y が大きいので、上は -1
const DIRECTIONS: Record<string, [number, number]> = {
  up: [0,-1],
  down: [0, 1],
  left: [-1, 0],
  right: [1,0],
};

// KEY_TO_DIRECTION … パソコンのキーの名前（event.key）→ 向き
//   別のキーでも動かしたいときは、ここに1行足すだけ
const KEY_TO_DIRECTION: Record<string, string> = {
  ArrowUp: "up",
  ArrowDown: "down",
  ArrowLeft: "left",
  ArrowRight: "right",
  w: "up",
  a: "left",
  s: "down",
  d: "right",
};

// HERO_IMAGES … 向き → 勇者の画像のファイル名（public/assets/〇〇.png）
const HERO_IMAGES: Record<string, string> = {
  down: "hero",
  up: "hero_up",
  left: "hero_left",
  right: "hero_right",
};

// =====================================================
// フィールドの敵
// =====================================================

// FieldEnemy … マップに置いた敵1体分のデータの形
type FieldEnemy = {
  id: number;          // 番号（絵の id "enemy-1" などに使う。重ならないようにする）
  x: number;           // 置く場所（マス）
  y: number;
  monsterId: string;   // どのモンスターか（monster.ts の MONSTERS のキー）
  alive: boolean;      // 生きているか（倒すと false、復活すると true）
};

// fieldEnemies … マップに置く敵の一覧。敵を増やすときは1行足すだけ
//   置く場所は、歩けるマス（草か道）にする
const fieldEnemies: FieldEnemy[] = [
  { id: 1, x: 6, y: 3, monsterId: "mushroom", alive: true },
  { id: 2, x: 3, y: 5, monsterId: "poisonMushroom", alive: true },
  { id: 3, x: 8, y: 1, monsterId: "mushroom", alive: true },
  { id: 4, x: 13, y: 8, monsterId: "mushroom", alive: true },
  { id: 5, x: 4, y: 12, monsterId: "mushroom", alive: true },
  { id: 6, x: 21, y: 11, monsterId: "mushroom", alive: true },
  { id: 7, x: 21, y: 5, monsterId: "poisonMushroom", alive: true },
  { id: 8, x: 16, y: 15, monsterId: "poisonMushroom", alive: true },
];

// =====================================================
// 上部のステータスとメッセージ
// =====================================================

// updateFieldStatus … 上部のステータス（Lv・HP・次のレベルまで・所持金）を今の値で描き直す
//   使っている場所：setupField の最後 / バトルやメニューから戻ったとき（コールバック）/ main.ts（放置報酬のあと）
export function updateFieldStatus() {
  const need = expToNext(player.level);   // 次のレベルまでに必要な経験値（合計）

  setTextById("hud-level", `Lv${player.level}`);
  setTextById("hud-hp", `${player.hp} / ${player.maxHp}`);
  setTextById("hud-exp", `次のレベルまで ${need - player.exp}`);   // 必要な量 − ためた量 ＝ あといくつ
  setTextById("hud-gold", `${player.gold}G`);

  const hpPercent = (player.hp / player.maxHp) * 100;   // HPの残りの割合（0〜100）

  setBar("hp-fill", hpPercent);                                                  // HPバーの長さ
  document.getElementById("hp-fill")?.classList.toggle("low", hpPercent <= 30);  // 30%以下なら赤くする
}

// showFieldMessage … 画面の下にメッセージを6秒だけ出す
//   text … 出す文字（「おかえりなさい！…」など）
//   使っている場所：main.ts（放置報酬）
export function showFieldMessage(text: string) {
  const element = document.getElementById("field-message");
  if (element) {
    element.textContent = text;
    setTimeout(() => {
      element.textContent = "";   // 空にすると、CSS の .message:empty でウィンドウごと消える
    }, 6000);
  }
}

// =====================================================
// 敵の復活とエンカウント
// =====================================================

const RESPAWN_MS = 10000;   // 倒した敵が復活するまでの時間（ミリ秒）

// scheduleRespawn … 一定時間後に、その敵を復活させる
//   enemy … 復活させる敵
//   勇者がそのマスに立っていたら、もう一度待つ（自分自身を呼ぶ＝再帰）
//   使っている場所：onWin（倒したとき）/ setupField（勇者と重なって始まったとき）
function scheduleRespawn(enemy: FieldEnemy) {
  setTimeout(() => {
    if (enemy.x === player.x && enemy.y === player.y) {
      scheduleRespawn(enemy);   // まだ勇者がいる → もう一度待つ
      return;
    }
    enemy.alive = true;
    document.getElementById("enemy-" + enemy.id)?.classList.remove("hidden");   // 隠していた絵を出す
  }, RESPAWN_MS);
}

// checkEncounter … 勇者が動いた先に敵がいたら、バトルを始める
//   prevX / prevY … 動く前にいたマス（にげたときにここへ戻す）
//   使っている場所：moveHero
function checkEncounter(prevX: number, prevY: number) {
  // enemy … 生きていて、勇者と同じマスにいる敵。いなければ undefined
  const enemy = fieldEnemies.find(
    (e) => e.alive && e.x === player.x && e.y === player.y
  );
  if (!enemy) {
    return;
  }

  // startBattle に「どうなったら何をするか」をまとめて渡す（コールバック）
  //   バトル（battle.ts）は、勝った・にげた・負けたを知らせるだけ
  //   そのあとどうするかは、ここ（フィールド）が決める
  startBattle({
    monsterId: enemy.monsterId,   // どのモンスターと戦うか
    onWin: () => {                // 勝ったとき
      enemy.alive = false;
      document.getElementById("enemy-" + enemy.id)?.classList.add("hidden");   // 絵を隠す（消さないので復活できる）
      scheduleRespawn(enemy);
      updateFieldStatus();
    },
    onEscape: () => {             // にげたとき：1歩前のマスに戻る
      player.x = prevX;
      player.y = prevY;
      drawHero();
      updateFieldStatus();
    },
    onLose: () => {               // 負けたとき：スタート地点に戻ってHP全回復
      player.x = START_X;
      player.y = START_Y;
      player.hp = player.maxHp;
      drawHero();
      updateFieldStatus();
    },
  });
}

// =====================================================
// カメラ（勇者が画面の真ん中に来るようにマップをずらす）
// =====================================================

// cameraOffset … マップをどれだけずらすか（px）を、横・縦それぞれで計算する
//   heroPx … 勇者の位置（px）
//   viewPx … 見えている窓の大きさ（px）
//   mapPx  … マップ全体の大きさ（px）
function cameraOffset(heroPx: number, viewPx: number, mapPx: number): number {
  if (mapPx <= viewPx) {
    return (viewPx - mapPx) / 2;   // マップが窓より小さいときは、真ん中に置く
  }
  // 勇者のマスの真ん中が窓の真ん中に来る位置。clamp でマップの端より外が見えないようにする
  return -clamp(heroPx + TILE_SIZE / 2 - viewPx / 2, 0, mapPx - viewPx);
}

// updateCamera … 今の勇者の位置に合わせて、マップ全体をずらす
//   使っている場所：drawHero / ResizeObserver（窓の大きさが変わったとき、画面が見えるようになったとき）
function updateCamera() {
  const map = document.getElementById("map");             // マップ全体
  const viewport = document.getElementById("viewport");   // のぞき窓
  if (!map || !viewport) {
    return;
  }

  // viewport.clientWidth … 地図の窓の幅（画面が hidden のときは 0 になる）
  // 隠れているときに計算すると、地図がずれた位置に動いてしまうので、何もしない
  if (viewport.clientWidth === 0) {
    return;
  }

  // clientWidth / clientHeight … 窓の今の実際の大きさ（px）
  const x = cameraOffset(player.x * TILE_SIZE, viewport.clientWidth, MAP_WIDTH * TILE_SIZE);
  const y = cameraOffset(player.y * TILE_SIZE, viewport.clientHeight, MAP_HEIGHT * TILE_SIZE);
  map.style.transform = `translate(${x}px, ${y}px)`;   // マップ全体をずらす
}

// =====================================================
// 勇者の表示と移動
// =====================================================

// drawHero … 勇者の絵を今の位置（player.x / player.y）に置いて、カメラも動かす
function drawHero() {
  const hero = document.getElementById("hero");
  if (hero) {
    hero.style.left = player.x * TILE_SIZE + "px";   // マス → px
    hero.style.top = player.y * TILE_SIZE + "px";
  }
  updateCamera();   // 勇者を動かしたら必ずカメラも動かす
}

// turnHero … 勇者の絵をその向きの画像に変える
//   as HTMLImageElement … 「これは画像の部品だよ」と伝える（.src を使うため）
function turnHero(direction: string) {
  const hero = document.getElementById("hero") as HTMLImageElement | null;
  const image = HERO_IMAGES[direction];
  if (hero && image) {
    hero.src = "assets/" + image + ".png";
  }
}

// moveHero … 勇者を1マス動かす
//   direction … "up" / "down" / "left" / "right"
//   使っている場所：キーボード / startWalking（スワイプ）
function moveHero(direction: string) {
  const delta = DIRECTIONS[direction];   // [横, 縦] の動く量。知らない向きなら undefined
  if (!delta) {
    return;
  }

  turnHero(direction);   // 歩けるかどうかに関係なく、まずそちらを向く（壁に向かって足踏み）

  const nextX = player.x + delta[0];   // 行き先
  const nextY = player.y + delta[1];

  if (isWalkable(nextX, nextY)) {   // 行き先が歩けるときだけ動く（当たり判定）
    const prevX = player.x;         // 動く前の場所を覚えておく（にげたときに戻すため）
    const prevY = player.y;
    player.x = nextX;
    player.y = nextY;
    drawHero();
    checkEncounter(prevX, prevY);   // 行き先に敵がいないか調べる
  }
}

// directionFromDrag … 指の動いた量から向きを決める
//   dx … 横の動き（右がプラス）/ dy … 縦の動き（下がプラス）
//   戻り値 … "up" / "down" / "left" / "right"。まだ少ししか動いていなければ null
function directionFromDrag(dx: number, dy: number): string | null {
  if (Math.abs(dx) < SWIPE_THRESHOLD && Math.abs(dy) < SWIPE_THRESHOLD) {
    return null;   // Math.abs … マイナスを取った大きさ
  }
  if (Math.abs(dx) > Math.abs(dy)) {
    return dx > 0 ? "right" : "left";   // 横のほうが大きく動いた
  }
  return dy > 0 ? "down" : "up";        // 縦のほうが大きく動いた
}

// stopWalking … 歩き続けるのをやめる
//   使っている場所：指を離したとき / startWalking（向きを変えるとき）
function stopWalking() {
  touchDirection = null;
  if (walkTimer !== null) {
    clearInterval(walkTimer);   // タイマーを止める
    walkTimer = null;
  }
}

// startWalking … その向きに歩き続ける
//   direction … 歩く向き
//   使っている場所：touchmove（指を動かしている間、何回も呼ばれる）
function startWalking(direction: string) {
  if (touchDirection === direction) {
    return;   // すでにその向きで歩いている → 何もしない（向きが変わったときだけ作り直す）
  }
  stopWalking();              // 前の向きのタイマーを止めてから
  touchDirection = direction;
  moveHero(direction);        // まず1歩
  // window.setInterval … ブラウザのタイマー（戻り値が number になる）
  walkTimer = window.setInterval(() => {
    if (getScene() !== "field") {
      stopWalking();   // バトルやメニューになったら歩くのをやめる
      return;
    }
    moveHero(direction);
  }, WALK_INTERVAL_MS);
}

// =====================================================
// フィールド画面を作る
// =====================================================

// setupField … フィールド画面を作り、操作をつなぐ（ゲームを開いたときに1回だけ）
//   root … フィールド画面の入れ物（main.ts の field-screen）
export function setupField(root: HTMLElement) {
  root.innerHTML = `
    <div class="hud">
      <div class="hud-status window">
        <div id="hud-level" class="hud-level"></div>
        <div class="bar-label">HP <span id="hud-hp"></span></div>
        <div class="bar"><div id="hp-fill" class="bar-fill hp"></div></div>
        <div id="hud-exp" class="hud-exp"></div>
      </div>
      <div class="hud-side">
        <div class="hud-gold window">
          <div>
            <div class="gold-label">所持金</div>
            <div id="hud-gold"></div>
          </div>
        </div>
        <button id="menu-toggle" class="window menu-toggle">メニュー</button>
      </div>
    </div>
    <p id="field-message" class="window message"></p>
    <div class="viewport" id="viewport">
      <div class="map" id="map"></div>
    </div>
  `;
  // hud      … 上部のステータス（左：Lv・HP・次のレベルまで / 右：所持金・メニュー）
  // message  … 画面の下に出るメッセージ
  // viewport … のぞき窓。この中の map（マップ全体）をずらしてスクロールさせる

  const map = root.querySelector<HTMLDivElement>("#map");
  if (!map) {
    return;
  }

  // CSS 変数 --tile に1マスの大きさを入れる（style.css の .tile で使う）
  document.documentElement.style.setProperty("--tile", TILE_SIZE + "px");

  // ResizeObserver … 窓の大きさが変わったら updateCamera を呼んでもらう
  //   （スマホを横にしたとき、バトルやメニューから戻って窓が見えるようになったとき）
  const viewport = root.querySelector<HTMLDivElement>("#viewport");
  if (viewport) {
    new ResizeObserver(updateCamera).observe(viewport);
  }

  // マップ全体の大きさ（px）
  map.style.width = MAP_WIDTH * TILE_SIZE + "px";
  map.style.height = MAP_HEIGHT * TILE_SIZE + "px";

  // 全部のマスに画像を並べる（外側が縦 y、内側が横 x）
  for (let y = 0; y < MAP_HEIGHT; y++) {
    for (let x = 0; x < MAP_WIDTH; x++) {
      const tile = document.createElement("img");
      tile.src = "assets/" + getTile(x, y) + ".png";   // grass.png など
      tile.className = "tile";
      tile.style.left = x * TILE_SIZE + "px";
      tile.style.top = y * TILE_SIZE + "px";
      map.appendChild(tile);
    }
  }

  // 敵の絵を並べる
  fieldEnemies.forEach((enemy) => {
    const img = document.createElement("img");
    img.src = "assets/" + MONSTERS[enemy.monsterId].image + ".png";   // モンスターのデータから画像名を取る
    img.id = "enemy-" + enemy.id;   // 倒したとき・復活するときに、この名前で探す
    img.className = "tile";
    img.style.left = enemy.x * TILE_SIZE + "px";
    img.style.top = enemy.y * TILE_SIZE + "px";

    // 勇者と同じマスの敵は、倒したことにして隠し、あとで復活させる（再開したときに重ならないように）
    //   まだ map に追加していないので、getElementById ではなく img を直接使う
    if (enemy.x === player.x && enemy.y === player.y)  {
      enemy.alive = false;
      img.classList.add("hidden");
      scheduleRespawn(enemy);
    }

    map.appendChild(img);
  });

  // 勇者の絵（最後に追加するので、タイルや敵より上に重なる）
  const hero = document.createElement("img");
  hero.src = "assets/hero.png";
  hero.id = "hero";
  hero.className = "tile hero";
  map.appendChild(hero);
  drawHero();

  // パソコン：キーで歩く
  window.addEventListener("keydown", (event) => {
    if (getScene() !== "field") {
      return;   // バトル中やメニュー中は動かない
    }
    const direction = KEY_TO_DIRECTION[event.key];   // 押されたキー → 向き
    if (direction) {
      event.preventDefault();   // 矢印キーで画面がスクロールしないようにする
      moveHero(direction);
    }
  });

  // スマホ：指を置いた場所を覚える
  root.addEventListener("touchstart", (event) => {
    const touch = event.touches[0];   // 1本目の指
    touchStartX = touch.clientX;
    touchStartY = touch.clientY;
  }, { passive: true });

  // スマホ：指を動かしたら、向きを決めて歩き続ける
  //   preventDefault と passive: false で、画面のスクロールや引っぱって再読み込みを止める
  root.addEventListener("touchmove", (event) => {
    event.preventDefault();
    const touch = event.touches[0];
    const direction = directionFromDrag(
      touch.clientX - touchStartX,   // 横にどれだけ動いたか
      touch.clientY - touchStartY    // 縦にどれだけ動いたか
    );
    if (direction) {
      startWalking(direction);
    }
  }, { passive: false });

  // スマホ：指を離したら止まる（touchcancel … 電話などで取り消されたとき）
  root.addEventListener("touchend", stopWalking);
  root.addEventListener("touchcancel", stopWalking);

  // メニューボタン：閉じたときにステータスを描き直してもらう
  root.querySelector("#menu-toggle")?.addEventListener("click", () => {
    openMenu(updateFieldStatus);
  });

  updateFieldStatus();   // 最初の表示
}

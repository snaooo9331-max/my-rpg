// =====================================================
// player.ts
// 勇者のデータと、勇者の強さ・成長に関する処理をまとめたファイル
//   使っている場所：battle.ts / field.ts / menu.ts / save.ts / offline.ts
// =====================================================

// findItem   … 装備の id から装備のデータを探す関数（items.ts）
// SLOTS      … 装備の枠の一覧 ["weapon", "head", …]（items.ts）
// ItemData   … 装備1つ分のデータの型（items.ts）
// Slot       … 装備の枠の名前の型 "weapon" | "head" | …（items.ts）
//   type を付けているのは「型だけを読み込む」という印
import { findItem, SLOTS, type ItemData, type Slot } from "./items";

// -----------------------------------------------------
// Character … 勇者のデータの「形」を決める型
//   export しているので、save.ts でも使っている
// -----------------------------------------------------
export type Character = {
    name: string;          // 名前（"勇者"）
    level: number;         // レベル
    exp: number;           // 今のレベルでためた経験値（レベルが上がると余りが残る）
    maxHp: number;         // 最大HP（素の値。装備では変わらない）
    hp: number;            // 今のHP
    attack: number;        // 素の攻撃力（装備込みは getAttack() で計算）
    defense: number;       // 素の守備力（装備込みは getDefense() で計算）
    gold: number;          // 所持金
    statPoints: number;    // 強化ポイント（menu.ts の「つよさ」で使う）
    skillPt: number;       // スキルポイント（メニューの「スキル」で使う）
                           //    ※ skillPointsという名前はsave.tsの古いデータの引き継ぎで消されるので使わない
    pointSkills: string[]; // ポイントで覚えたスキルのidのリスト（レベルで覚えるスキルは入れない）
    equipment: Record<Slot, string | null>;  // 枠ごとにつけている装備の id。つけていなければ null
    ownedItems: string[];  // 持っている装備の id のリスト（買うと増える）
    rebirthCount: number;  // 転生した回数
    x: number;             // フィールドでの横の位置（マス）
    y: number;             // フィールドでの縦の位置（マス）
};

// -----------------------------------------------------
// BASE_STATS … Lv1・転生0回のときの最初の強さ
//   player の初期値と rebirth() の両方で使うので、1か所にまとめている
//   export していないので、このファイルの中だけで使える
// -----------------------------------------------------
const BASE_STATS = {
    maxHp: 30,
    attack: 8,
    defense: 3,
};

// スタート地点（マス）。負けたときにここへ戻る（field.ts の onLose）
export const START_X = 2;
export const START_Y = 2;

// -----------------------------------------------------
// emptyEquipment … 「何もつけていない」装備の対応表を作って返す
//   使っている場所：下の player の初期値 / save.ts（古いセーブの引き継ぎ）
//   関数にしているのは、呼ぶたびに新しい対応表を作るため
//   （同じ対応表を使い回すと、片方を変えたときにもう片方も変わってしまう）
// -----------------------------------------------------
export function emptyEquipment(): Record<Slot, string | null> {
  return {
    weapon: null,
    head: null,
    shield: null,
    body: null,
    hands: null,
    feet: null,
    accessory1: null,
    accessory2: null,
  };
}

// -----------------------------------------------------
// player … ゲーム中の勇者のデータ本体（ここにしかない）
//   const でも中身の数字は変えられる（入れ替えられないのは player そのもの）
//   セーブデータがあれば、save.ts の loadGame() が中身を上書きする
// -----------------------------------------------------
export const player: Character = {
    name: "勇者",
    level: 1,
    exp: 0,
    maxHp: BASE_STATS.maxHp,       // 最初の強さは BASE_STATS から
    hp: BASE_STATS.maxHp,          // 最初は満タン
    attack: BASE_STATS.attack,
    defense: BASE_STATS.defense,
    gold: 0,
    statPoints: 0,
    skillPt: 0,
    pointSkills: [],
    equipment: emptyEquipment(),   // 最初は何もつけていない
    ownedItems: [],
    rebirthCount: 0,
    x: START_X,                    // 最初はスタート地点
    y:START_Y,
};

// -----------------------------------------------------
// expToNext … 次のレベルまでに必要な経験値
//   level … 今のレベル
//   Lv1→2 は 10、Lv2→3 は 20 …。レベルアップのきつさはこの1行で調整できる
//   使っている場所：gainExp / field.ts（ステータスバー）/ menu.ts（ステータス画面）
// -----------------------------------------------------
export function expToNext(level: number): number {
    return level * 10;
}

// -----------------------------------------------------
// gainExp … 経験値をもらって、足りていればレベルアップする
//   amount … もらう経験値（battle.ts では倒した敵の exp、offline.ts では放置報酬）
//   戻り値 … レベルアップのメッセージのリスト（上がらなければ空のリスト）
// -----------------------------------------------------
export function gainExp(amount: number): string[] {
    const messages: string[] = [];   // レベルアップのメッセージをためていくリスト
    player.exp += amount;

    // while … 条件が成り立つ間くり返す
    //   一度に2レベル以上上がることもあるので if ではなく while
    while (player.exp >= expToNext(player.level)) {
        player.exp -= expToNext(player.level);   // 使った分を引いて、余りを次のレベルへ持ち越す
        player.level += 1;
        player.maxHp += 5;       // レベルアップで上がる能力
        player.attack += 2;
        player.defense += 1;
        player.statPoints += 1;  // 強化ポイントを1つもらう
        player.skillPt += 1;
        player.hp = player.maxHp;            // ごほうびでHP全回復
        messages.push(`レベルが ${player.level} にあがった！`);   // push … リストの最後に足す
    }

    return messages;
}

// -----------------------------------------------------
// equippedItems … 今つけている装備のデータだけのリストを返す
//   export していないので、このファイルの中だけで使う（getAttack / getDefense）
// -----------------------------------------------------
function equippedItems(): ItemData[] {
  return SLOTS                                         // 8つの枠を順番に
    .map((slot) => findItem(player.equipment[slot]))   // 枠ごとに装備のデータを探す（つけていなければ undefined）
    .filter((item) => item !== undefined);             // undefined を取り除く
}

// -----------------------------------------------------
// getAttack … 装備込みの攻撃力
//   素の攻撃力（player.attack）に、つけている装備の攻撃力を全部足す
//   使っている場所：battle.ts（ダメージ計算）/ menu.ts / offline.ts（放置報酬）
// -----------------------------------------------------
export function getAttack(): number {
  let total = player.attack;                // まず素の攻撃力から
  for (const item of equippedItems()) {     // つけている装備を1つずつ
    total += item.attack;                   // その装備の攻撃力を足す（手袋やアクセサリーも含む）
  }
  return total;
}

// -----------------------------------------------------
// getDefense … 装備込みの守備力（getAttack と同じ形）
//   使っている場所：battle.ts（敵の攻撃を受けたとき）/ menu.ts
// -----------------------------------------------------
export function getDefense(): number {
  let total = player.defense;
  for (const item of equippedItems()) {
    total += item.defense;
  }
  return total;
}



// -----------------------------------------------------
// 転生
// -----------------------------------------------------

// REBIRTH_LEVEL … 転生できるレベル。確認のときは 2 などに下げると楽
export const REBIRTH_LEVEL = 10;

// canRebirth … 今転生できるか（レベルが REBIRTH_LEVEL 以上なら true）
//   使っている場所：menu.ts（転生ボタンを押せるかどうか）
export function canRebirth(): boolean {
    return player.level >= REBIRTH_LEVEL;   // 比べた結果（true / false）をそのまま返す
}

// rebirth … 転生する
//   レベル・経験値・ゴールド・強化ポイントは最初に戻す
//   装備（equipment / ownedItems）と位置はそのまま残す
//   使っている場所：menu.ts（転生ボタン）
export function rebirth() {
    player.rebirthCount += 1;
    player.level = 1;
    player.exp = 0;
    player.gold = 0;
    player.statPoints = 0;
    player.skillPt = 0;
    player.pointSkills = [];

    // 最初の強さ ＋ 転生ボーナス（転生1回ごとに 最大HP+10 / 攻撃力+2 / 守備力+1）
    player.maxHp = BASE_STATS.maxHp + player.rebirthCount * 10;
    player.attack = BASE_STATS.attack + player.rebirthCount * 2;
    player.defense = BASE_STATS.defense + player.rebirthCount * 1;
    player.hp = player.maxHp;   // HPは満タンで新しい旅を始める
}

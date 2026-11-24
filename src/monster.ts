// =====================================================
// monster.ts
// モンスターのデータ（強さ・報酬）をまとめたファイル
//   使っている場所：battle.ts（バトル）/ field.ts（マップに置く敵の絵）
// =====================================================

// -----------------------------------------------------
// MonsterData … モンスター1種類分のデータの「形」
// -----------------------------------------------------
export type MonsterData = {
    name: string;     // 画面に出す名前
    image: string;    // 画像のファイル名（public/assets/〇〇.png の 〇〇 の部分）
    maxHp: number;    // 最大HP
    attack: number;   // 攻撃力
    defense: number;  // 守備力
    exp: number;      // 倒したときにもらえる経験値（player.ts の gainExp に渡す）
    gold: number;     // 倒したときにもらえるゴールド
};

// -----------------------------------------------------
// MONSTERS … モンスターの一覧（対応表）
//   キー（mushroom など）… プログラムの中で使う名前
//     field.ts の fieldEnemies の monsterId に、このキーを書くとそのモンスターが出る
//   Record<string, …> なので、キーは自由に増やせる
//     そのかわり、ない名前を引いてもエラーにならない
//     → battle.ts では MONSTERS[id] ?? MONSTERS.mushroom のように対策している
//   モンスターを増やすときは、ここに1つ足すだけ
// -----------------------------------------------------
export const MONSTERS: Record<string, MonsterData> = {
    mushroom: {
        name: "キノコの魔物",
        image: "mushroom",
        maxHp: 15,
        attack: 5,
        defense: 1,
        exp: 3,
        gold: 5,
    },
    poisonMushroom: {
        name: "毒キノコ",
        image: "poison_mushroom",
        maxHp: 25,
        attack: 7,
        defense: 3,
        exp: 10,
        gold: 12,
    },
};

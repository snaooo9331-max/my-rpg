// =====================================================
// items.ts
// 装備のデータと、装備の枠（部位）に関するものをまとめたファイル
//   使っている場所：player.ts（強さの計算）/ menu.ts（そうび画面・ステータス画面）
// =====================================================

// -----------------------------------------------------
// ItemType … 装備の「種類」
//   アクセサリーは種類としては1つ（つける枠は2つある → 下の Slot）
// -----------------------------------------------------
export type ItemType = "weapon" | "head" | "shield" | "body" | "hands" | "feet" | "accessory";

// -----------------------------------------------------
// ItemData … 装備1つ分のデータの「形」
// -----------------------------------------------------
export type ItemData = {
  id: string;       // プログラムの中で使う名前（セーブデータにはこの id で保存される。あとから変えない）
  name: string;     // 画面に出す名前
  type: ItemType;   // 装備の種類（どの枠につけられるかは SLOT_TYPE で決まる）
  attack: number;   // つけると上がる攻撃力
  defense: number;  // つけると上がる守備力
  speed: number;    // つけると上がるすばやさ（今は表示だけ。バトルの効果はあとで）
  price: number;    // 買うときの値段（G）
};

// -----------------------------------------------------
// Slot … 装備をつける「枠」
//   アクセサリーだけ accessory1 / accessory2 の2つある
// -----------------------------------------------------
export type Slot = "weapon" | "head" | "shield" | "body" | "hands" | "feet" | "accessory1" | "accessory2";

// SLOTS … 枠の一覧（リスト）。そうび画面・ステータス画面に並べる「順番」はここで決まる
export const SLOTS: Slot[] = ["weapon", "head", "shield", "body", "hands", "feet", "accessory1", "accessory2"];

// -----------------------------------------------------
// SLOT_TYPE … 枠 → その枠につけられる装備の種類（対応表）
//   accessory1 も accessory2 も、"accessory" の装備をつけられる
//   使っている場所：menu.ts（部位を開いたとき、つけられる装備だけ並べる）
// -----------------------------------------------------
export const SLOT_TYPE: Record<Slot, ItemType> = {
  weapon: "weapon",
  head: "head",
  shield: "shield",
  body: "body",
  hands: "hands",
  feet: "feet",
  accessory1: "accessory",
  accessory2: "accessory",
};

// -----------------------------------------------------
// SLOT_LABELS … 枠 → 画面に出す名前（対応表）
//   Record<Slot, …> なので、枠を増やして書き忘れると赤線で教えてくれる
// -----------------------------------------------------
export const SLOT_LABELS: Record<Slot, string> = {
  weapon: "武器",
  head: "あたま",
  shield: "盾",
  body: "服",
  hands: "手袋",
  feet: "くつ",
  accessory1: "アクセサリー",
  accessory2: "アクセサリー",
};

// -----------------------------------------------------
// ITEMS … 全部の装備の一覧（データ）
//   装備を増やすときは、ここに1行足すだけ
//   id は持っている装備やつけている装備としてセーブされるので、一度決めたら変えない
// -----------------------------------------------------
export const ITEMS: ItemData[] = [
  // 武器
  { id: "woodSword", name: "木の剣", type: "weapon", attack: 3, defense: 0, speed: 0, price: 20 },
  { id: "ironDagger", name: "鉄の短剣", type: "weapon", attack: 7, defense: 0, speed: 0, price: 60 },
  // あたま
  { id: "leatherCap", name: "革の帽子", type: "head", attack: 0, defense: 1, speed: 0, price: 15 },
  { id: "ironHelm", name: "鉄のかぶと", type: "head", attack: 0, defense: 3, speed: 0, price: 50 },
  // 盾
  { id: "woodShield", name: "木の盾", type: "shield", attack: 0, defense: 2, speed: 0, price: 25 },
  { id: "ironShield", name: "鉄の盾", type: "shield", attack: 0, defense: 4, speed: 0, price: 70 },
  // 服（前の「防具」は、ここに引き継がれている）
  { id: "travelerClothes", name: "旅人の服", type: "body", attack: 0, defense: 2, speed: 0, price: 15 },
  { id: "leatherGuard", name: "革の胸当て", type: "body", attack: 0, defense: 5, speed: 0, price: 50 },
  // 手袋
  { id: "travelerGloves", name: "旅人の手袋", type: "hands", attack: 3, defense: 0, speed: 0, price: 30 },
  { id: "ironGauntlets", name: "鉄の小手", type: "hands", attack: 2, defense: 2, speed: 0, price: 80 },
  // くつ
  { id: "travelerBoots", name: "旅人のくつ", type: "feet", attack: 0, defense: 0, speed: 3, price: 30 },
  // アクセサリー（2つの枠どちらにもつけられる）
  { id: "attackRing", name: "アタックリング", type: "accessory", attack: 5, defense: 0, speed: 0, price: 120 },
  { id: "defenseRing", name: "ディフェンスリング", type: "accessory", attack: 0, defense: 5, speed: 0, price: 120 },
];

// -----------------------------------------------------
// bonusText … 装備の効果を「攻撃力+2 守備力+2」のような文字にする
//   item … 装備のデータ
//   戻り値 … 0ではない効果だけを空白でつないだ文字。何もなければ「—」
//   使っている場所：menu.ts（部位の一覧、装備の一覧）
// -----------------------------------------------------
export function bonusText(item: ItemData): string {
  // bonuses … [名前, 数字] の組のリスト
  const bonuses: [string, number][] = [
    ["攻撃力", item.attack],
    ["守備力", item.defense],
    ["すばやさ", item.speed],
  ];

  const text = bonuses
    .filter(([, value]) => value !== 0)              // 0のものを取り除く（[, value] … 1つ目は使わないので飛ばす）
    .map(([label, value]) => `${label}+${value}`)    // 「攻撃力+2」の形にする
    .join(" ");                                       // 空白でつなぐ

  return text === "" ? "—" : text;   // 全部0だったときは「—」
}

// -----------------------------------------------------
// findItem … id から装備のデータを探す
//   id … 装備の id。つけていない枠は null が来る
//   戻り値 … 見つかった装備のデータ。null や、ない id なら undefined
//   使っている場所：player.ts（強さの計算）/ menu.ts（つけている装備の名前など）
// -----------------------------------------------------
export function findItem(id: string | null): ItemData | undefined {
  if (id === null) {
    return undefined;   // 何もつけていない
  }
  return ITEMS.find((item) => item.id === id);   // find … 条件に合う最初の1つ。なければ undefined
}

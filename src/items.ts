export type ItemType = "weapon" | "head" | "shield" | "body" | "hands" | "feet" | "accessory";

export type ItemData = {
  id: string;
  name: string;
  type: ItemType;
  attack: number;
  defense: number;
  speed: number;
  price: number;
};

export type Slot = "weapon" | "head" | "shield" | "body" | "hands" | "feet" | "accessory1" | "accessory2";

export const SLOTS: Slot[] = ["weapon", "head", "shield", "body", "hands", "feet", "accessory1", "accessory2"];

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

export const ITEMS: ItemData[] = [
  { id: "woodSword", name: "木の剣", type: "weapon", attack: 3, defense: 0, speed: 0, price: 20 },
  { id: "ironDagger", name: "鉄の短剣", type: "weapon", attack: 7, defense: 0, speed: 0, price: 60 },
  { id: "leatherCap", name: "革の帽子", type: "head", attack: 0, defense: 1, speed: 0, price: 15 },
  { id: "ironHelm", name: "鉄のかぶと", type: "head", attack: 0, defense: 3, speed: 0, price: 50 },
  { id: "woodShield", name: "木の盾", type: "shield", attack: 0, defense: 2, speed: 0, price: 25 },
  { id: "ironShield", name: "鉄の盾", type: "shield", attack: 0, defense: 4, speed: 0, price: 70 },
  { id: "travelerClothes", name: "旅人の服", type: "body", attack: 0, defense: 2, speed: 0, price: 15 },
  { id: "leatherGuard", name: "革の胸当て", type: "body", attack: 0, defense: 5, speed: 0, price: 50 },
  { id: "travelerGloves", name: "旅人の手袋", type: "hands", attack: 3, defense: 0, speed: 0, price: 30 },
  { id: "ironGauntlets", name: "鉄の小手", type: "hands", attack: 2, defense: 2, speed: 0, price: 80 },
  { id: "travelerBoots", name: "旅人のくつ", type: "feet", attack: 0, defense: 0, speed: 3, price: 30 },
  { id: "attackRing", name: "アタックリング", type: "accessory", attack: 5, defense: 0, speed: 0, price: 120 },
  { id: "defenseRing", name: "ディフェンスリング", type: "accessory", attack: 0, defense: 5, speed: 0, price: 120 },
];

export function bonusText(item: ItemData): string {
  const bonuses: [string, number][] = [
    ["攻撃力", item.attack],
    ["守備力", item.defense],
    ["すばやさ", item.speed],
  ];

  const text = bonuses
    .filter(([, value]) => value !== 0)
    .map(([label, value]) => `${label}+${value}`)
    .join(" ");

  return text === "" ? "—" : text;
}

export function findItem(id: string | null): ItemData | undefined {
  if (id === null) {
    return undefined;
  }
  return ITEMS.find((item) => item.id === id);
}
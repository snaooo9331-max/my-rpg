export type ItemType = "weapon" | "armor";

export type ItemData = {
  id: string;
  name: string;
  type: ItemType;
  attack: number;
  defense: number;
  price: number;
};

export const ITEMS: ItemData[] = [
  {id: "woodSword", name: "木の剣", type: "weapon", attack: 3, defense: 0, price: 20},
  {id: "ironDagger", name: "鉄の短剣", type: "weapon", attack: 7, defense: 0, price: 60},
  {id: "travelerClothes", name: "旅人の服", type: "armor", attack: 0, defense: 2, price: 15},
  {id: "leatherGuard", name: "革の胸当て", type: "armor", attack: 0, defense: 5, price: 50},
];

export function findItem(id: string | null): ItemData | undefined {
  if (id === null) {
    return undefined;
  }
  return ITEMS.find((item) => item.id === id);
}
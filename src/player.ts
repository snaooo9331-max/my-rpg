import { findItem, SLOTS, type ItemData, type Slot } from "./items";

export type Character = {
    name: string;
    level: number;
    exp: number;
    maxHp: number;
    hp: number;
    attack: number;
    defense: number;
    gold: number;
    statPoints: number;
    equipment: Record<Slot, string | null>;
    ownedItems: string[];
    rebirthCount: number;
    x: number;
    y: number;
};

const BASE_STATS = {
    maxHp: 30,
    attack: 8,
    defense: 3,
};

export const START_X = 2;
export const START_Y = 2;

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

export const player: Character = {
    name: "勇者",
    level: 1,
    exp: 0,
    maxHp: BASE_STATS.maxHp,
    hp: BASE_STATS.maxHp,
    attack: BASE_STATS.attack,
    defense: BASE_STATS.defense,
    gold: 0,
    statPoints: 0,
    equipment: emptyEquipment(),
    ownedItems: [],
    rebirthCount: 0,
    x: START_X,
    y:START_Y,
};

export function expToNext(level: number): number {
    return level * 10;
}

export function gainExp(amount: number): string[] {
    const messages: string[] = [];
    player.exp += amount;

    while (player.exp >= expToNext(player.level)) {
        player.exp -= expToNext(player.level);
        player.level += 1;
        player.maxHp += 5;
        player.attack += 2;
        player.defense += 1;
        player.statPoints += 1;
        player.hp = player.maxHp;
        messages.push(`レベルが ${player.level} にあがった！`);
    }

    return messages;
}

function equippedItems(): ItemData[] {
  return SLOTS
    .map((slot) => findItem(player.equipment[slot]))
    .filter((item) => item !== undefined);
}

export function getAttack(): number {
  let total = player.attack;
  for (const item of equippedItems()) {
    total += item.attack;
  }
  return total;
}

export function getDefense(): number {
  let total = player.defense;
  for (const item of equippedItems()) {
    total += item.defense;
  }
  return total;
}



export const REBIRTH_LEVEL = 10;

export function canRebirth(): boolean {
    return player.level >= REBIRTH_LEVEL;
}

export function rebirth() {
    player.rebirthCount += 1;
    player.level = 1;
    player.exp = 0;
    player.gold = 0;
    player.statPoints = 0;

    player.maxHp = BASE_STATS.maxHp + player.rebirthCount * 10;
    player.attack = BASE_STATS.attack + player.rebirthCount * 2;
    player.defense = BASE_STATS.defense + player.rebirthCount * 1;
    player.hp = player.maxHp;
}
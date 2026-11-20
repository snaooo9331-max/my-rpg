import { findItem } from "./items";

export type Character = {
    name: string;
    level: number;
    exp: number;
    maxHp: number;
    hp: number;
    attack: number;
    defense: number;
    gold: number;
    skillPoints: number;
    weapon: string | null;
    armor: string | null;
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

export const player: Character = {
    name: "勇者",
    level: 1,
    exp: 0,
    maxHp: BASE_STATS.maxHp,
    hp: BASE_STATS.maxHp,
    attack: BASE_STATS.attack,
    defense: BASE_STATS.defense,
    gold: 0,
    skillPoints: 0,
    weapon: null,
    armor: null,
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
        player.skillPoints += 1;
        player.hp = player.maxHp;
        messages.push(`レベルが ${player.level} にあがった！`);
    }

    return messages;
}

export function getAttack(): number {
    const weapon = findItem(player.weapon);
    const armor = findItem(player.armor);
    return player.attack + (weapon?.attack ?? 0) + (armor?.attack ?? 0);
}

export function getDefense(): number {
    const weapon = findItem(player.weapon);
    const armor = findItem(player.armor);
    return player.defense + (weapon?.defense ?? 0) + (armor?.defense ?? 0);
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
    player.skillPoints = 0;

    player.maxHp = BASE_STATS.maxHp + player.rebirthCount * 10;
    player.attack = BASE_STATS.attack + player.rebirthCount * 2;
    player.defense = BASE_STATS.defense + player.rebirthCount * 1;
    player.hp = player.maxHp;
}
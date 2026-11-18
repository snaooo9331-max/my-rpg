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
};

export const player: Character = {
    name: "勇者",
    level: 1,
    exp: 0,
    maxHp: 30,
    hp: 30,
    attack: 8,
    defense: 3,
    gold: 0,
    skillPoints: 0,
    weapon: null,
    armor: null,
    ownedItems: [],
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
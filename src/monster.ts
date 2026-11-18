export type MonsterData = {
    name: string;
    image: string;
    maxHp: number;
    attack: number;
    defense: number;
    exp: number;
    gold: number;
};

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
        exp: 8,
        gold: 12,
    },
};
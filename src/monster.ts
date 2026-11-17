export type MonsterData = {
    name: string;
    image: string;
    maxHp: number;
    attack: number;
    defense: number;
};

export const MONSTERS: Record<string, MonsterData> = {
    mushroom: {
        name: "キノコの魔物",
        image: "mushroom",
        maxHp: 15,
        attack: 5,
        defense: 1,
    },
    poisonMushroom: {
        name: "毒キノコ",
        image: "poison_mushroom",
        maxHp: 25,
        attack: 7,
        defense: 3,
    },
};
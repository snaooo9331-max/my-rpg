export type Character = {
    name: string;
    maxHp: number;
    hp: number;
    attack: number;
    defense: number;
};

export const player: Character = {
    name: "勇者",
    maxHp: 30,
    hp: 30,
    attack: 8,
    defense: 3,
};
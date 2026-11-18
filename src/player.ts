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
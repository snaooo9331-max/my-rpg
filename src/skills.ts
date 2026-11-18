export type StatName = "attack" | "defense" | "maxHp";

export type SkillUpgrade = {
  id: string;
  name: string;
  stat: StatName;
  amount: number;
};

export const STAT_LABELS: Record<StatName, string> = {
  attack: "攻撃力",
  defense: "守備力",
  maxHp: "最大HP",
};

export const SKILL_UPGRADES: SkillUpgrade[] = [
  { id: "power", name: "ちから", stat: "attack", amount: 1 },
  { id: "guard", name: "まもり", stat: "defense", amount: 1 },
  { id: "vitality", name: "たいりょく", stat: "maxHp", amount: 5 },
];
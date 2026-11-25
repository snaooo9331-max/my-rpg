// =====================================================
// skills.ts
// 戦闘で使うスキル（わざ）の種類と一覧
//   使う予定の場所：battle.ts（スキルのボタン・オート）
// =====================================================

// player … 勇者のデータ。レベルを見て、覚えたスキルを決める（player.ts）
import { player } from "./player";

// SkillType … スキルの種類。攻撃するか、回復するか
//   ヒント：items.ts の ItemType と同じ書き方。"attack" と "heal" の2つ
export type SkillType = "attack" | "heal";

// SkillData … スキル1つ分のデータ
export type SkillData = {
    id: string;         //見分けるための名前(ボタンのdata-idに使う)
    name: string;       //画面に出す名前
    type: SkillType;    //攻撃か回復か
    power: number;      //攻撃：攻撃力の何倍か / 回復：最大HPの何％回復するか
    cooldown: number;   //何ターンに1回使えるか（3なら、使ったあと2ターンは使えない）
    learnLevel: number; //何レベルで覚えるか
};

// SKILLS … 全部のスキル（増やすときは、ここに1行足すだけ）
export const SKILLS: SkillData[] = [
    { id: "strongSlash", name: "つよぎり", type: "attack", power: 1.5, cooldown: 3, learnLevel: 3 },
    { id: "rest", name: "いやしの風", type: "heal", power: 40, cooldown: 4, learnLevel: 5 },
];
// つよぎり   … 攻撃力の1.5倍のダメージ。使ったら3ターン待つ。レベル3で覚える
// いやしの風 … 最大HPの40％回復。使ったら4ターン待つ。レベル5で覚える

// learnedSkills … 今のレベルで覚えているスキルだけを返す
export function learnedSkills(): SkillData[] {
  return SKILLS.filter((s) => s.learnLevel <= player.level);
}

// findSkill … id からスキルを探す（見つからなければ undefined）
export function findSkill(id: string): SkillData | undefined {
  return SKILLS.find((s) => s.id === id);
}
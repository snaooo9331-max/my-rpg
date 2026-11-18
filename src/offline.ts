import { player, gainExp, getAttack } from "./player";

const MIN_OFFLINE_MS = 60 * 1000;
const MAX_OFFLINE_MS = 8 * 60 * 60 * 1000;
const EXP_RATE = 20;
const GOLD_RATE = 2;

export function giveOfflineReward(lastSaveTime: number): string | null {
  const elapsed = Math.min(Date.now() - lastSaveTime, MAX_OFFLINE_MS);
  if (elapsed < MIN_OFFLINE_MS) {
    return null;
  }

  const minutes = elapsed / 60000;
  const exp = Math.floor((minutes * getAttack()) /EXP_RATE);
  const gold = Math.floor((minutes * player.level) / GOLD_RATE);

  if (exp === 0 && gold === 0) {
    return null;
  }

  player.gold += gold;
  const levelUps = gainExp(exp);

  let text = `おかえりなさい！ ${Math.floor(minutes)}分の間に${exp}の経験値と${gold}Gを手に入れた！`;
  if (levelUps.length > 0) {
    text += ` レベルが${player.level}に上がった！`;
  }
  return text;
}
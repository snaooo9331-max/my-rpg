// =====================================================
// ui.ts
// どの画面でも使う、小さな便利関数
//   使っている場所：field.ts / battle.ts
// =====================================================

// clamp … 数を min 〜 max の間におさめる
//   例：clamp(120, 0, 100) → 100 / clamp(-5, 0, 100) → 0 / clamp(50, 0, 100) → 50
//   Math.max(value, min) で下を切って、Math.min(…, max) で上を切る
export function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

// setTextById … id で探した要素の文字を書き換える
//   id … 書き換えたい要素の id / text … 表示する文字
//   見つからなくてもエラーにならないように if で確かめる
export function setTextById(id: string, text: string) {
  const element = document.getElementById(id);
  if (element) {
    element.textContent = text;   // textContent … HTML ではなく、ただの文字として入れる
  }
}

// setBar … HPバーなどの長さを変える
//   id … バーの id / percent … 何％の長さにするか
//   0〜100 からはみ出さないように clamp を使う（HPがマイナスでもバーが変にならない）
export function setBar(id: string, percent: number) {
  const element = document.getElementById(id);
  if (element) {
    element.style.width = clamp(percent, 0, 100) + "%";   // 例：50 → "50%"
  }
}

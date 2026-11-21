export function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

export function setTextById(id: string, text: string) {
  const element = document.getElementById(id);
  if (element) {
    element.textContent = text;
  }
}

export function setBar(id: string, percent: number) {
  const element = document.getElementById(id);
  if (element) {
    element.style.width = clamp(percent, 0, 100) + "%";
  }
}
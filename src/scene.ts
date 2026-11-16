export type Scene = "field" | "battle";

let currentScene: Scene = "field";

export function getScene(): Scene {
  return currentScene;
}

export function changeScene(next: Scene) {
  currentScene = next;

  document.getElementById("field-screen")?.classList.toggle("hidden", next !== "field");
  document.getElementById("battle-screen")?.classList.toggle("hidden", next !== "battle");
}
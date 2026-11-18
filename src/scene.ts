export type Scene = "field" | "battle" | "menu";

const SCENES: Scene[] = ["field", "battle", "menu"];

let currentScene: Scene = "field";

export function getScene(): Scene {
  return currentScene;
}

export function changeScene(next: Scene) {
  currentScene = next;
  SCENES.forEach((scene) => {
    document.getElementById(scene + "-screen")?.classList.toggle("hidden", scene !== next);
  });
}
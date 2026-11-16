import "./style.css";

const app = document.querySelector<HTMLDivElement>("#app");

if (app) {
  app.innerHTML = `
    <h1>My RPG</h1>
    <img src="assets/hero.png" class="sprite" alt="勇者">
  `;
}
import draw from './draw.js';
import { start } from './game.js';

console.log('index.js loaded');

window.addEventListener('load', async () => {
  await draw.init();
  // await game.init();
  // db.init();

  window.addEventListener('resize', () => {
    draw.handleResize();
  });

  // window.game = game;
  //@ts-ignore
  window.draw = draw;
  console.log('app loaded');
  // game.showMenu();

  start();
});

import { Player } from './components.js';
import { getPlayerEntity } from './entities.js';

/** @param {import('./ecs.js').ECS} ecs */
export function RenderActors(ecs) {
  /** @type {any} */
  const canvas = document.getElementById('canvasDiv');

  this.update = () => {
    canvas.style.filter = getPlayerEntity(ecs).get(Player).gameOver
      ? 'grayscale(1)'
      : '';
  };
}

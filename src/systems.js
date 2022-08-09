// @ts-check

import { Player, Sprite, PhysicsBody } from './components.js';
import draw from './draw.js';

// /**
//  * @param {number} a
//  * @returns {string}
//  */
// function test(a) {
//   return 1;
// }

/**
 * @typedef {object} Entity
 * @property {(a: any) => object} get
 */

/**
 * @param {any} selector
 * @param {(entity: object) => void} iterate
 * @returns {object}
 */
function createSingleSystem(selector, iterate) {
  return Object.assign(this, {
    update: () => selector.iterate(iterate),
  });
}

/**
 * @param {import('./ecs.js').ECS} ecs
 */
export function Movement(ecs) {
  const selector = ecs.select(PhysicsBody);

  /**
   * @param {Entity} entity
   */
  const iterate = (entity) => {
    /** @type {PhysicsBody} */
    const physics = entity.get(PhysicsBody);

    physics.x += physics.vx;
    physics.y += physics.vy;

    if (physics.x < 0 || physics.x + physics.width > draw.width) {
      physics.vx = -physics.vx;
    }
    if (physics.y < 0 || physics.y + physics.height > draw.height) {
      physics.vy = -physics.vy;
    }
  };

  createSingleSystem.bind(this)(selector, iterate);
}

/**
 * @param {import('./ecs.js').ECS} ecs
 */
export function Render(ecs) {
  const selector = ecs.select(PhysicsBody, Sprite);

  /**
   * @param {Entity} entity
   */
  const iterate = (entity) => {
    const physics = entity.get(PhysicsBody);
    const drawable = entity.get(Sprite);
    draw.drawRect(physics.x, physics.y, physics.width, physics.height, 'red');
  };

  createSingleSystem.bind(this)(selector, iterate);
}

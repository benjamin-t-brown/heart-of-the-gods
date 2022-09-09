import { PhysicsBody } from './components.js';
import { draw } from './draw.js';
import { createSystem, getVector } from './utils.js';

/** @param {import('./ecs.js').ECS} ecs */
export function Movement(ecs) {
  const selector = ecs.select(PhysicsBody);

  /**
   * @param {PhysicsBody} physics
   */
  function applyDrag(physics) {
    const frameRatio = draw.fm;
    const coeff = physics.coeff;

    let forceX = 0;
    let forceY = 0;
    // experimented with this for a while (linear/quadratic) this division by 2 gives
    // a slidy-ness that I like
    forceX = (coeff * physics.vx) / 2;
    forceY = (coeff * physics.vy) / 2;

    physics.vx -= (forceX / physics.mass) * frameRatio;
    physics.vy -= (forceY / physics.mass) * frameRatio;
  }

  /** @param {import('./systems.js').Entity} entity */
  const iterate = (entity) => {
    /** @type {PhysicsBody} */
    const physics = entity.get(PhysicsBody);

    if (physics.acc || physics.accRev) {
      const [ax, ay] = getVector(physics.angle, physics.accRate);
      physics.ax = ax;
      physics.ay = ay;
      if (physics.accRev) {
        physics.ax *= -0.5;
        physics.ay *= -0.5;
      }
    }

    const frameRatio = draw.fm;
    const vxMod = (physics.ax / physics.mass) * frameRatio;
    const vyMod = (physics.ay / physics.mass) * frameRatio;

    physics.vx += vxMod;
    physics.vy += vyMod;

    if (physics.dragOn) {
      applyDrag(physics);
    }

    physics.x += physics.vx * frameRatio;
    physics.y += physics.vy * frameRatio;

    physics.ax = 0.0;
    physics.ay = 0.0;
    physics.acc = false;
  };

  createSystem.bind(this)(selector, iterate);
}

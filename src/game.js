import draw from './draw.js';
import { setFm, setNow } from './generics.js';
import ecs from './ecs.js';
import { Player, Sprite, PhysicsBody } from './components.js';
import { Movement, Render } from './systems.js';

const SIXTY_FPS_MS = 16;

export const start = () => {
  console.log('START', start);

  ecs.register(Player, Sprite, PhysicsBody);
  ecs.process(new Movement(ecs), new Render(ecs));

  const physics = new PhysicsBody(0, 0);
  physics.setV(1, 1.2);
  ecs.create().add(new Player(), new Sprite('player'), physics);

  loop();
};

/**
 * @param {number} frameTime
 */
const integrate = (frameTime) => {
  draw.clear();
  ecs.update(frameTime / 1000);
};

const loop = () => {
  const startTime = performance.now();
  let prevNow = startTime;

  /**
   * @param {number} now
   */
  const _loop = (now) => {
    let frameTime = now - prevNow;
    prevNow = now;
    setNow(now);

    if (frameTime > 4) {
      frameTime = 4;
    }
    while (frameTime > 0.0) {
      const deltaTime = Math.min(frameTime, SIXTY_FPS_MS);
      const fm = deltaTime / SIXTY_FPS_MS;
      draw.fm = fm;
      integrate(deltaTime);
      setNow(now + deltaTime);
      frameTime -= deltaTime;
    }
    requestAnimationFrame(_loop);
  };
  _loop(startTime);
};

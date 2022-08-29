import { draw } from './draw.js';
import { ecs } from './ecs.js';
import { getComponents } from './components.js';
import { getSystems } from './systems.js';
import { newGame } from './entities.js';

console.log('index.js loaded');
const EXPECTED_FS = 10;

export const start = () => {
  console.log('App start');

  ecs.register(...getComponents());
  ecs.process(...getSystems(ecs));

  newGame(ecs);

  // DEBUG, CENTER OF MAP
  // const physics = new PhysicsBody(WORLD_WIDTH / 2, WORLD_HEIGHT / 2);
  // const renderable = new Renderable({
  //   circle: {
  //     r: 64,
  //     color: 'pink',
  //   },
  //   z: 100,
  // });
  // ecs.create()?.add(renderable, physics);

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

  /** */
  const _loop = () => {
    const now = performance.now();
    let frameTime = now - prevNow;
    let prevFrameTime = Math.floor(frameTime);
    prevNow = now;

    if (frameTime > 4) {
      frameTime = 4;
    }
    // while (frameTime > 0.0) {
    // const deltaTime = Math.min(frameTime, EXPECTED_FS);
    const deltaTime = frameTime;
    frameTime -= deltaTime;
    const fm = deltaTime / EXPECTED_FS;
    draw.fm = fm;
    draw.enabled = frameTime <= 0;
    integrate(deltaTime);

    // }
    draw.drawText('FS: ' + prevFrameTime, 20, 50, {
      align: 'left',
    });
    // requestAnimationFrame(_loop);
    // setTimeout(_loop, 16);
  };
  setInterval(_loop, 16);
  // _loop();
};

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

import { draw } from './draw.js';
import { ecs } from './ecs.js';
import { getComponents } from './components.js';
import { getSystems } from './systems.js';
import { newGame } from './entities.js';
import { render } from './render.js';
import { RenderUi } from './systems.render-ui.js';
import { normalize } from './utils.js';

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

  const renderUi = new RenderUi(ecs);

  const msPerUpdate = 22;
  const targetMult = normalize(msPerUpdate, 16, 30, 1, 2);

  /** */
  const _loop = () => {
    const now = performance.now();
    let frameTime = now - prevNow;
    let prevFrameTime = Math.floor(frameTime);
    prevNow = now;

    if (frameTime > 4) {
      frameTime = 4;
    }
    const deltaTime = frameTime;
    frameTime -= deltaTime;
    const fm = (deltaTime * targetMult) / EXPECTED_FS;
    draw.fm = fm;
    draw.enabled = frameTime <= 0;
    integrate(deltaTime);

    // if (

    // draw.drawText('FS: ' + prevFrameTime, draw.width - 100, 50, {
    //   align: 'left',
    // });

    // fixed interval works out a bit better
    // setTimeout(_loop, 16);
  };

  const _loopRender = () => {
    render.drawRenderObjects(ecs);
    renderUi.update();
    requestAnimationFrame(_loopRender);
  };

  setInterval(_loop, msPerUpdate);
  _loopRender();
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

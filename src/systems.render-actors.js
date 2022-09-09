import { Camera, PhysicsBody, Player, Renderable } from './components.js';
import { draw } from './draw.js';
import { getBaseEntity, getPlayerEntity } from './entities.js';
import { distance, getAngleTowards, getVector } from './utils.js';

/** @param {import('./ecs.js').ECS} ecs */
export function RenderActors(ecs) {
  const sprites = ecs.select(PhysicsBody, Renderable);
  const camera = ecs.select(Camera);

  let renderList = [];

  /**
   * @param {{entity, z}[]} arr
   * @param {{entity, z}} val
   */
  function addAndSort(arr, val) {
    arr.push(val);
    for (let i = arr.length - 1; i > 0 && arr[i].z < arr[i - 1].z; i--) {
      const tmp = arr[i];
      arr[i] = arr[i - 1];
      arr[i - 1] = tmp;
    }
  }

  /** @param {import('./systems.js').Entity} entity */
  const drawEntity = (entity) => {
    /** @type {PhysicsBody} */
    const { x, y, angle } = entity.get(PhysicsBody);
    /** @type {Renderable} */
    const {
      spriteName,
      circle,
      rectangle,
      opacity,
      scale,
      flipped,
      highlighted,
      ship,
    } = entity.get(Renderable);

    let spritePostFix = '';
    if (flipped) {
      spritePostFix += '_f';
    }
    if (highlighted) {
      spritePostFix += '_h';
    }

    draw.setOpacity(opacity);
    if (spriteName) {
      draw.drawSprite(spriteName + spritePostFix, x, y, angle, scale);
    }
    if (circle) {
      const { r, color } = circle;
      draw.drawCircle(x, y, r * scale, color);
    }
    if (rectangle) {
      const { w, h, color } = rectangle;
      draw.drawRect(x, y, w * scale, h * scale, color);
    }
    if (ship) {
      const spriteList = ship.getHitCirclePositions(angle);
      for (const {
        offset: [eX, eY],
        spr,
      } of spriteList) {
        draw.drawSprite(spr + spritePostFix, x + eX, y + eY, angle, scale);
      }
      const turretList = ship.getTurretPositions(angle);
      for (const { spr, physics } of turretList) {
        draw.drawSprite(spr, physics.x, physics.y, physics.angle, scale);
      }
    }
    draw.setOpacity(1);
  };

  /** @param {import('./systems.js').Entity} entity */
  const addToRenderList = (entity) => {
    /** @type {Renderable} */
    const renderable = entity.get(Renderable);
    addAndSort(renderList, {
      entity,
      z: renderable.z,
    });
  };

  /** @param {import('./systems.js').Entity} entity */
  const drawRelativeToCamera = (entity) => {
    /** @type {Camera} */
    const { x, y, w, h } = entity.get(Camera);
    const ctx = draw.getCtx();
    ctx.save();
    ctx.translate(-x, -y);
    for (const { entity } of renderList) {
      const { x: x2, y: y2 } = entity.get(PhysicsBody);
      if (
        distance(x + w / 2, y + h / 2, x2, y2) <
        draw.SCREEN_WIDTH / 2 + 160
      ) {
        drawEntity(entity);
      }
    }

    // compass
    const { x: baseX, y: baseY } = getBaseEntity(ecs).get(PhysicsBody);
    const { x: playerX, y: playerY } = getPlayerEntity(ecs).get(PhysicsBody);
    const angle = getAngleTowards([playerX, playerY], [baseX, baseY]);
    const [eX, eY] = getVector(angle, 96);
    const [eX2, eY2] = getVector(angle, 64);
    draw.drawCircle(playerX + eX, playerY + eY, 2, '#FFF');
    draw.drawLine(
      playerX + eX2,
      playerY + eY2,
      playerX + eX,
      playerY + eY,
      '#FFF'
    );

    ctx.restore();
    renderList = [];
  };

  /** @type {any} */
  const canvas = document.getElementById('canvasDiv');

  this.update = () => {
    canvas.style.filter = getPlayerEntity(ecs).get(Player).gameOver
      ? 'grayscale(1)'
      : '';

    sprites.iterate(addToRenderList);
    camera.iterate(drawRelativeToCamera);
  };
}

import { Camera, PhysicsBody, Renderable } from './components.js';
import { draw } from './draw.js';
import { getBaseEntity, getPlayerEntity } from './entities.js';
import { distance, getAngleTowards, getVector } from './utils.js';

class Render {
  /**
   * @typedef {object} RenderObjectAssoc
   * @property {string} id
   * @property {import('./systems.js').Entity} ent
   */
  /** @typedef {RenderObjectAssoc[]} */
  renderObjects = [];

  /** @typedef {Camera} */
  camera;

  /**
   * @param {import('./systems.js').Entity} entity
   */
  addRenderObject(entity) {
    if (entity.get(Renderable) && entity.get(PhysicsBody)) {
      this.renderObjects.push({
        id: entity.id,
        ent: entity,
      });
    }
  }

  /**
   * @param {import('./systems.js').Entity} entity
   */
  removeRenderObject(entity) {
    const ind = this.renderObjects.findIndex((ro) => ro.id === entity.id);
    if (ind > -1) {
      this.renderObjects.splice(ind, 1);
    }
  }

  /** @param {import('./systems.js').Entity} entity */
  drawEntity = (entity) => {
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
      useHeading,
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
      draw.drawSprite(
        spriteName + spritePostFix,
        x,
        y,
        useHeading ? angle : 0,
        scale
      );
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

  /**
   * @param {RenderObjectAssoc[]} arr
   */
  sortRenderObjects(arr) {
    if (arr.length < 2) {
      return;
    }

    let swapOccurred = false;
    do {
      swapOccurred = false;
      for (let i = 0; i < arr.length - 1; i++) {
        const elemA = arr[i];
        const elemB = arr[i + 1];

        const roA = elemA.ent.get(Renderable);
        const roB = elemB.ent.get(Renderable);

        if (roA.z > roB.z) {
          swapOccurred = true;
          arr[i] = elemB;
          arr[i + 1] = elemA;
        }
      }
    } while (swapOccurred);
  }

  /**
   * @param {import('./ecs.js').ECS} ecs
   */
  drawRenderObjects(ecs) {
    this.sortRenderObjects(this.renderObjects);

    if (!this.camera) {
      return;
    }

    /** @type {Camera} */
    const { x, y, w, h } = this.camera;
    const ctx = draw.getCtx();
    ctx.save();
    ctx.translate(-x, -y);
    for (let i = 0; i < this.renderObjects.length; i++) {
      const { ent } = this.renderObjects[i];
      const { x: x2, y: y2 } = ent.get(PhysicsBody);
      if (
        distance(x + w / 2, y + h / 2, x2, y2) <
        draw.SCREEN_WIDTH / 2 + 160
      ) {
        this.drawEntity(ent);
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
  }
}

export const render = new Render();

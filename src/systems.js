import {
  Player,
  Renderable,
  PhysicsBody,
  LimitedLifetime,
  Exhaust,
  Water,
  Ship,
  Camera,
  WORLD_WIDTH,
  WORLD_HEIGHT,
  TILE_SCALE,
  HitRectangle,
  HitCircle,
  Projectile,
  HitHighlightRender,
  Ai,
  HitPoints,
  Ui,
  SpriteListRender,
  Crate,
  UnderworldLegion,
  Turret,
} from './components.js';
import draw from './draw.js';
import {
  createCrate,
  createEnemyShip,
  createExhaust,
  createExplosion,
  createProjectile,
  getBaseEntity,
  getLegion,
  getPlayerEntity,
  getUiEntity,
  isBaseEntity,
  isPlayerEntity,
  newGame,
} from './entities.js';
import * as utils from './utils.js';

/**
 * @typedef {object} Entity
 * @property {number} id
 * @property {(a: object) => object} get
 * @property {(a: object) => void} has
 * @property {(...a: object[]) => void} add
 * @property {(...a: object[]) => void} remove
 * @property {() => void} eject
 */

const PLAYER_PROJECTILE_COLOR = 'cyan';
const ENEMY_PROJECTILE_COLOR = 'orange';

/**
 * @param {any} selector
 * @param {(entity: object) => void} iterate
 * @returns {object}
 */
function createSystem(selector, iterate) {
  return Object.assign(this, {
    update:
      typeof selector === 'function'
        ? selector
        : () => selector.iterate(iterate),
  });
}

/** @param {import('./ecs.js').ECS} ecs */
function Input(ecs) {
  const selector = ecs.select(Player, PhysicsBody, HitPoints);

  /** @type {KeyboardEvent[]} */
  let keysDown = [];
  /** @type {KeyboardEvent[]} */
  let keysUp = [];

  window.addEventListener('keydown', (ev) => {
    keysDown.push(ev);
  });

  window.addEventListener('keyup', (ev) => {
    keysUp.push(ev);
  });

  // const handleKeyDown = (key, player, physics) => {};

  /**
   * @param {Player} player
   * @param {PhysicsBody} physics
   * @param {HitPoints} hp
   */
  const handleKeyUpdate = (player, physics, hp) => {
    if (hp.hp <= 0 || getBaseEntity(ecs).get(HitPoints).hp <= 0) {
      return;
    }

    let accelerating = false;

    if (player.keys.ArrowLeft || player.keys.a) {
      physics.turn('l');
    }
    if (player.keys.ArrowRight || player.keys.d) {
      physics.turn('r');
    }
    if (player.keys.ArrowUp || player.keys.w) {
      accelerating = true;
    }

    physics.acc = accelerating;
  };

  /** @param {Entity} entity */
  const iterate = (entity) => {
    /** @type {Player} */
    const player = entity.get(Player);
    /** @type {PhysicsBody} */
    const physics = entity.get(PhysicsBody);
    /** @type {HitPoints} */
    const hp = entity.get(HitPoints);

    keysDown.forEach((ev) => {
      if (!player.gameStarted) {
        player.gameStarted = true;
      }
      player.setKeyDown(ev.key);
      // handleKeyDown(ev.key, player, physics);
    });
    keysUp.forEach((ev) => {
      player.setKeyUp(ev.key);
    });

    if (player.gameStarted) {
      handleKeyUpdate(player, physics, hp);
    }

    if (keysUp.length) {
      keysUp = [];
    }
    if (keysDown.length) {
      keysDown = [];
    }
  };

  createSystem.bind(this)(selector, iterate);
}

/** @param {import('./ecs.js').ECS} ecs */
function Movement(ecs) {
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

  /** @param {Entity} entity */
  const iterate = (entity) => {
    /** @type {PhysicsBody} */
    const physics = entity.get(PhysicsBody);

    if (physics.acc) {
      const [ax, ay] = utils.getVector(physics.angle, physics.accRate);
      physics.ax = ax;
      physics.ay = ay;
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

/** @param {import('./ecs.js').ECS} ecs */
function LimitedLifetimeUpdater(ecs) {
  const selector = ecs.select(LimitedLifetime);
  const particles = ecs.select(LimitedLifetime, Renderable);

  /** @param {Entity} entity */
  const updateAndRemoveLifetimes = (entity) => {
    /** @type {LimitedLifetime} */
    const lt = entity.get(LimitedLifetime);

    if (lt.timer.isComplete()) {
      entity.eject();
    }
  };

  /** @param {Entity} entity */
  const updateParticles = (entity) => {
    /** @type {LimitedLifetime} */
    const lt = entity.get(LimitedLifetime);
    const renderable = entity.get(Renderable);
    renderable.opacity = utils.normalize(
      lt.timer.getPctComplete(),
      0,
      1,
      lt.opacity.start,
      lt.opacity.end
    );

    renderable.scale = utils.normalize(
      lt.timer.getPctComplete(),
      0,
      1,
      lt.scale.start,
      lt.scale.end
    );
  };

  this.update = () => {
    selector.iterate(updateAndRemoveLifetimes);
    particles.iterate(updateParticles);
  };
}

/** @param {import('./ecs.js').ECS} ecs */
function ExhaustParticleSpawner(ecs) {
  const selector = ecs.select(Exhaust, PhysicsBody);

  /** @param {Entity} entity */
  const iterate = (entity) => {
    /** @type {Exhaust} */
    const exhaust = entity.get(Exhaust);
    /** @type {PhysicsBody} */
    const physics = entity.get(PhysicsBody);

    if (exhaust.spawnTimer.isComplete() && physics.acc) {
      const [eX, eY] = utils.getVector(physics.angle, -exhaust.r * 0.8);
      createExhaust(ecs, physics.x + eX, physics.y + eY);
      exhaust.spawnTimer.start();
    }
  };

  createSystem.bind(this)(selector, iterate);
}

/** @param {import('./ecs.js').ECS} ecs */
function UnderworldLegionSpawner(ecs) {
  this.update = () => {
    if (!getPlayerEntity(ecs).get(Player).gameStarted) {
      return;
    }

    const legionEntity = getLegion(ecs);
    /** @type {UnderworldLegion} */
    const legion = legionEntity.get(UnderworldLegion);

    if (legion.waveTimer.isComplete()) {
      console.log('SPAWN LEGION', legion.waveNumber + 5);
      for (let i = 0; i < legion.waveNumber + 5; i++) {
        const r = utils.randomInt(WORLD_WIDTH, WORLD_WIDTH * 1.5);
        const angle = utils.randomInt(0, 359);
        const [x, y] = utils.getVector(angle, r);
        createEnemyShip(ecs, WORLD_WIDTH / 2 + x, WORLD_HEIGHT / 2 + y, 3);
        console.log('create ship', WORLD_WIDTH / 2 + x, WORLD_HEIGHT / 2 + y);
      }
      legion.waveNumber++;
      legion.waveTimer.start();
    }
  };
}

/** @param {import('./ecs.js').ECS} ecs */
function WaterSimulation(ecs) {
  const selector = ecs.select(Water);

  /** @param {Entity} entity */
  const iterate = (entity) => {
    /** @type {Water} */
    const water = entity.get(Water);
    for (const tile of water.tiles) {
      const ent = ecs.get(tile.id);
      if (tile.timer.isComplete()) {
        const r = ent.get(Renderable);
        water.incTile(tile);
        r.spriteName = water.getSpriteName(tile);
        water.resetTileTimer(tile);
      }
    }
  };

  createSystem.bind(this)(selector, iterate);
}

/** @param {import('./ecs.js').ECS} ecs */
function HitHighlightFlipper(ecs) {
  const selector = ecs.select(Renderable, HitHighlightRender);

  /** @param {Entity} entity */
  const iterate = (entity) => {
    /** @type {Renderable} */
    const renderable = entity.get(Renderable);
    /** @type {HitHighlightRender} */
    const h = entity.get(HitHighlightRender);

    renderable.highlighted = !h.sprTimer.isComplete();
  };

  createSystem.bind(this)(selector, iterate);
}

/** @param {import('./ecs.js').ECS} ecs */
function SpriteListFlipper(ecs) {
  const selector = ecs.select(Renderable, SpriteListRender);

  /** @param {Entity} entity */
  const iterate = (entity) => {
    /** @type {Renderable} */
    const renderable = entity.get(Renderable);
    /** @type {SpriteListRender} */
    const s = entity.get(SpriteListRender);

    if (s.sprTimer.isComplete()) {
      s.sprTimer.start();
      s.i = (s.i + 1) % s.sprites.length;
      renderable.spriteName = s.sprites[s.i];
    }
  };

  createSystem.bind(this)(selector, iterate);
}

/** @param {import('./ecs.js').ECS} ecs */
function TurretAI(ecs) {
  const ships = ecs.select(Ship, PhysicsBody, HitPoints);
  const turrets = ecs.select(Turret, PhysicsBody);

  /**
   * @param {number} xTurret
   * @param {number} yTurret
   * @param {Entity} owningEntity
   * @returns {number[] | null}
   */
  const getClosestTarget = (xTurret, yTurret, owningEntity) => {
    let closestDist = Infinity;
    /** @type {number[]}*/
    let ret = [];

    let targets = [];

    ships.iterate((entity) => {
      /** @type {Ship} */
      const ship = entity.get(Ship);
      /** @type {PhysicsBody} */
      const { angle, x, y } = entity.get(PhysicsBody);

      if (entity.id === owningEntity.id) {
        return;
      }

      for (const { offset } of ship.hitCircles) {
        const [eX, eY] = utils.getVector(angle, offset);
        const circleX = x + eX;
        const circleY = y + eY;
        const d = utils.distance(circleX, circleY, xTurret, yTurret);
        targets.push([circleX, circleY, d]);
      }
    });

    turrets.iterate((entity) => {
      /** @type {PhysicsBody} */
      const { x, y } = entity.get(PhysicsBody);
      const d = utils.distance(x, y, xTurret, yTurret);
      targets.push([x, y, d]);
    });

    const base = getBaseEntity(ecs);
    const basePhysics = base.get(PhysicsBody);
    const { x, y } = basePhysics;
    const d = utils.distance(x, y, xTurret, yTurret);
    targets.push([x, y, d]);

    for (let i = 0; i < targets.length; i++) {
      const target = targets[i];
      if (target[2] < closestDist) {
        ret = target;
        closestDist = target[2];
      }
    }

    return ret.length ? ret : null;
  };

  /**
   * @param {number} turretX
   * @param {number} turretY
   * @returns {number[]}
   */
  const acquirePlayerTarget = (turretX, turretY) => {
    const playerShipPhysics = getPlayerEntity(ecs).get(PhysicsBody);
    const distToPlayer = utils.distance(
      turretX,
      turretY,
      playerShipPhysics.x,
      playerShipPhysics.y
    );
    return [playerShipPhysics.x, playerShipPhysics.y, distToPlayer];
  };

  /**
   * @param {Turret} turret
   * @param {string} type
   * @param {number[]} target
   * @returns {boolean | undefined}
   */
  const updateTurret = (turret, type, target) => {
    const [targetX, targetY, d] = target;
    const { physics, range, timer, sprTimer, dmg } = turret;

    if (d < range) {
      physics.lookAt([targetX, targetY]);
      if (timer.isComplete()) {
        timer.start();
        sprTimer.start();
        const vec = utils.getVector(physics.angle, 16);
        createProjectile(ecs, type, {
          col:
            type === 'player'
              ? PLAYER_PROJECTILE_COLOR
              : ENEMY_PROJECTILE_COLOR,
          x: physics.x + vec[0],
          y: physics.y + vec[1],
          angle: physics.angle,
          spd: 10 + Math.sqrt(physics.vx ** 2 + physics.vy ** 2),
          dmg,
          ms: 5000,
        });
      }
      return true;
    }
  };

  /** @param {Entity} entity */
  const updateShipTurrets = (entity) => {
    /** @type {Ship} */
    const ship = entity.get(Ship);
    /** @type {PhysicsBody} */
    const { angle, x, y } = entity.get(PhysicsBody);
    /** @type {HitPoints} */
    const hp = entity.get(HitPoints);

    const turretList = ship.getTurretPositions(angle);
    for (const turret of turretList) {
      const {
        offset: [eX, eY],
        physics,
      } = turret;

      const turretX = (physics.x = x + eX);
      const turretY = (physics.y = y + eY);

      /** @type {number[] | null}*/
      let target;
      let type = 'player';
      if (isPlayerEntity(entity)) {
        target = getClosestTarget(turretX, turretY, entity);
      } else {
        type = 'enemy';
        target = acquirePlayerTarget(turretX, turretY);
      }
      if (!target || hp.hp <= 0) {
        continue;
      }

      if (updateTurret(turret, type, target)) {
        continue;
      }
    }
  };

  /** @param {Entity} entity */
  const updateStandaloneTurrets = (entity) => {
    /** @type {Turret} */
    const turret = entity.get(Turret);
    const target = acquirePlayerTarget(turret.physics.x, turret.physics.y);
    updateTurret(turret, 'enemy', target);
  };

  this.update = () => {
    const player = getPlayerEntity(ecs).get(Player);
    if (!player.gameStarted || player.gameOver) {
      return;
    }

    ships.iterate(updateShipTurrets);
    turrets.iterate(updateStandaloneTurrets);
  };
}

/** @param {import('./ecs.js').ECS} ecs */
function ShipAi(ecs) {
  const selector = ecs.select(Ai, PhysicsBody);

  /** @param {Entity} entity */
  const iterate = (entity) => {
    /** @type {PhysicsBody} */
    const physics = entity.get(PhysicsBody);

    const playerShipPhysics = getPlayerEntity(ecs).get(PhysicsBody);
    // const distToPlayer = utils.distance(
    //   physics.x,
    //   physics.y,
    //   playerShipPhysics.x,
    //   playerShipPhysics.y
    // );

    // if (distToPlayer < 500) {
    physics.turnTowards([playerShipPhysics.x, playerShipPhysics.y]);
    physics.acc = true;
    // }
  };

  createSystem.bind(this)(selector, iterate);
}

/** @param {import('./ecs.js').ECS} ecs */
function CameraMover(ecs) {
  const selector = ecs.select(Camera, Ship, PhysicsBody);

  /** @param {Entity} entity */
  const iterate = (entity) => {
    /** @type {Camera} */
    const camera = entity.get(Camera);
    /** @type {PhysicsBody} */
    const physics = entity.get(PhysicsBody);

    camera.x = physics.x - camera.w / 2;
    camera.y = physics.y - camera.h / 2;

    const minSize = (-16 * TILE_SCALE) / 2;
    const maxW = WORLD_WIDTH - (16 * TILE_SCALE) / 2;
    const maxH = WORLD_HEIGHT - (16 * TILE_SCALE) / 2;

    if (camera.x < minSize) {
      camera.x = minSize;
    }
    if (camera.x + camera.w > maxW) {
      camera.x = maxW - camera.w;
    }
    if (camera.y < minSize) {
      camera.y = minSize;
    }
    if (camera.y + camera.h > maxH) {
      camera.y = maxH - camera.h;
    }

    camera.x = Math.floor(camera.x);
    camera.y = Math.round(camera.y);
  };

  createSystem.bind(this)(selector, iterate);
}

/** @param {import('./ecs.js').ECS} ecs */
function HitPointChecker(ecs) {
  const selector = ecs.select(PhysicsBody, HitPoints);

  /** @param {Entity} entity */
  const iterate = (entity) => {
    /** @type {HitPoints} */
    const hp = entity.get(HitPoints);
    /** @type {PhysicsBody} */
    const { x, y } = entity.get(PhysicsBody);

    if (hp.hp <= 0) {
      hp.hp = 0;
      if (isPlayerEntity(entity) || isBaseEntity(entity)) {
        const player = getPlayerEntity(ecs).get(Player);
        const ui = getUiEntity(ecs).get(Ui);
        if (ui.endTimer.isComplete() && !player.gameOver) {
          player.gameOver = true;
          ui.endTimer.start();
          ui.endTimer.onCompletion().then(() => {
            newGame(ecs);
          });
          for (let i = 0; i < 20; i++) {
            setTimeout(
              () =>
                createExplosion(
                  ecs,
                  x + utils.randomInt(-32, 32),
                  y + utils.randomInt(-32, 32)
                ),
              i * 150
            );
          }
        }
        ui.endTimer.update();
      } else {
        entity.eject();
        createExplosion(ecs, x, y);
        createCrate(ecs, x, y);
      }
    }
  };

  createSystem.bind(this)(selector, iterate);
}

/** @param {import('./ecs.js').ECS} ecs */
function RenderUi(ecs) {
  /** */
  function renderGameUi() {
    const playerEntity = getPlayerEntity(ecs);
    const player = playerEntity.get(Player);

    const playerHp = playerEntity.get(HitPoints);
    const baseHp = getBaseEntity(ecs).get(HitPoints);

    const playerHpPct = playerHp.hp / playerHp.maxHp;
    const baseHpPct = baseHp.hp / baseHp.maxHp;

    const hpWidth = 256;
    const hpHeight = 20;
    const bottom = draw.height - 40;
    const playerHpX = 20;
    const baseHpX = draw.width - hpWidth - 20;

    draw.drawRect(playerHpX, bottom, hpWidth, hpHeight, '#101E29');
    draw.drawRect(
      playerHpX,
      bottom,
      hpWidth * playerHpPct,
      hpHeight,
      '#42CAFD'
    );
    draw.drawText(
      'Player HP: ' + Math.round(playerHpPct * 100),
      playerHpX + 4,
      bottom + 11,
      {
        align: 'left',
      }
    );
    draw.drawRect(baseHpX, bottom, hpWidth, hpHeight, '#101E29');
    draw.drawRect(baseHpX, bottom, hpWidth * baseHpPct, hpHeight, '#F47E1B');
    draw.drawText(
      'Heart HP: ' + Math.round(baseHpPct * 100),
      baseHpX + 4,
      bottom + 11,
      {
        align: 'left',
      }
    );

    draw.drawText('Supplies: ' + player.crates, draw.width / 2, bottom + 11);
  }

  this.update = () => {
    const ui = getUiEntity(ecs).get(Ui);

    if (!ui.beginTimer.isComplete()) {
      draw.drawText(
        'Destroy the Heart of the Gods at any cost!',
        draw.width / 2,
        50,
        {
          // align: 'left',
          size: 32,
        }
      );
    }

    if (!ui.endTimer.isComplete()) {
      draw.drawText('Game over.', draw.width / 2, draw.height / 2, {
        // align: 'left',
        size: 48,
      });
    }

    renderGameUi();

    const playerEntity = getPlayerEntity(ecs);
    const player = playerEntity.get(Player);
    if (!player.gameStarted) {
      draw.drawRect(0, 0, draw.width, draw.height, '#000');
      draw.drawText(
        'Press any button to start.',
        draw.width / 2,
        draw.height / 2,
        {
          // align: 'left',
          size: 48,
        }
      );
    }
  };
}

/** @param {import('./ecs.js').ECS} ecs */
function RenderActors(ecs) {
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

  /** @param {Entity} entity */
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

  /** @param {Entity} entity */
  const addToRenderList = (entity) => {
    /** @type {Renderable} */
    const renderable = entity.get(Renderable);
    addAndSort(renderList, {
      entity,
      z: renderable.z,
    });
  };

  /** @param {Entity} entity */
  const drawRelativeToCamera = (entity) => {
    /** @type {Camera} */
    const { x, y, w, h } = entity.get(Camera);
    const ctx = draw.getCtx();
    ctx.save();
    ctx.translate(-x, -y);
    for (const { entity } of renderList) {
      const { x: x2, y: y2 } = entity.get(PhysicsBody);
      if (
        utils.distance(x + w / 2, y + h / 2, x2, y2) <
        draw.SCREEN_WIDTH / 2 + 160
      ) {
        drawEntity(entity);
      }
    }

    // compass
    const { x: baseX, y: baseY } = getBaseEntity(ecs).get(PhysicsBody);
    const { x: playerX, y: playerY } = getPlayerEntity(ecs).get(PhysicsBody);
    const angle = utils.getAngleTowards([playerX, playerY], [baseX, baseY]);
    const [eX, eY] = utils.getVector(angle, 96);
    const [eX2, eY2] = utils.getVector(angle, 64);

    // draw.drawLine
    draw.drawCircle(playerX + eX, playerY + eY, 2, 'red');
    draw.drawLine(
      playerX + eX2,
      playerY + eY2,
      playerX + eX,
      playerY + eY,
      'red'
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

/** @param {import('./ecs.js').ECS} ecs */
function Collisions(ecs) {
  const ships = ecs.select(Ship, PhysicsBody, HitHighlightRender, HitPoints);
  const islands = ecs.select(HitRectangle, PhysicsBody);
  const projectiles = ecs.select(HitCircle, PhysicsBody, Projectile);
  const bases = ecs.select(
    HitCircle,
    PhysicsBody,
    HitHighlightRender,
    HitPoints
  );
  const crates = ecs.select(HitCircle, PhysicsBody, Crate);

  // /**
  //  * @param {PhysicsBody} physics
  //  * @param {HitCircle} hitCircle
  //  * @returns {number[]}
  //  */
  // function getCollisionCircle(physics, hitCircle) {}

  /**
   * @param {Entity} entity2
   */
  function checkShipPlayerCollisions(entity2) {
    // if (entity1 === entity2 || isPlayerEntity(entity2)) {
    //   return;
    // }

    const entity1 = getPlayerEntity(ecs);

    if (entity1 === entity2) {
      return;
    }

    /** @type {Ship} */
    const ship1 = entity1.get(Ship);
    /** @type {PhysicsBody} */
    const ship1Physics = entity1.get(PhysicsBody);
    /** @type {PhysicsBody} */
    const ship2Physics = entity2.get(PhysicsBody);

    for (const { r, offset } of ship1.hitCircles) {
      const [eX, eY] = utils.getVector(ship1Physics.angle, offset);
      const { x, y } = ship1Physics;

      const [eX2, eY2] = utils.getVector(ship2Physics.angle, 0);
      const { x: x2, y: y2 } = ship2Physics;

      if (utils.circleCollides([x + eX, y + eY, r], [x2 + eX2, y2 + eY2, 10])) {
        entity2.get(HitPoints).hp = 0;
        return;
      }
      // DEBUG
      // draw.getCtx().save();
      // draw.getCtx().translate(-camera.x, -camera.y);
      // draw.drawCircle(x + eX, y + eY, hitCircle.r, 'rgba(255, 0, 0, 0.25)');
      // draw.getCtx().restore();
    }
  }

  /**
   * @param {Entity} shipEntity
   * @param {Entity} projectileEntity
   */
  function checkShipProjectileCollisions(shipEntity, projectileEntity) {
    /** @type {Ship} */
    const ship1 = shipEntity.get(Ship);
    /** @type {PhysicsBody} */
    const shipPhysics = shipEntity.get(PhysicsBody);
    /** @type {HitHighlightRender} */
    const shipHitHighlightRender = shipEntity.get(HitHighlightRender);

    /** @type {HitCircle} */
    const circ = projectileEntity.get(HitCircle);
    /** @type {Projectile} */
    const proj = projectileEntity.get(Projectile);
    /** @type {PhysicsBody} */
    const projPhysics = projectileEntity.get(PhysicsBody);

    if (
      (isPlayerEntity(shipEntity) && proj.allegiance === 'player') ||
      (!isPlayerEntity(shipEntity) && proj.allegiance === 'enemy')
    ) {
      return;
    }

    for (const { r, offset } of ship1.hitCircles) {
      const [eX, eY] = utils.getVector(shipPhysics.angle, offset);
      const { x, y } = shipPhysics;

      // console.log(
      //   'CHECK COLL',
      //   [x + eX, y + eY, r],
      //   [circ.circle.x, circ.circle.y, circ.circle.r]
      // );

      if (
        utils.circleCollides(
          [x + eX, y + eY, r],
          [projPhysics.x, projPhysics.y, circ.circle.r]
        )
      ) {
        projectileEntity.eject();
        shipHitHighlightRender.sprTimer.start();
        shipEntity.get(HitPoints).hp -= proj.dmg;
        return;
      }
    }
  }

  /**
   * @param {Entity} shipEntity
   * @param {Entity} islandEntity
   */
  function checkShipIslandCollisions(shipEntity, islandEntity) {
    /** @type {Ship} */
    const ship1 = shipEntity.get(Ship);
    /** @type {PhysicsBody} */
    const shipPhysics = shipEntity.get(PhysicsBody);

    /** @type {HitRectangle} */
    const rect = islandEntity.get(HitRectangle);

    for (const { r, offset } of ship1.hitCircles) {
      const [eX, eY] = utils.getVector(shipPhysics.angle, offset);

      const { x, y, w, h } = rect.rect;

      const shipX = shipPhysics.x + eX;
      const shipY = shipPhysics.y + eY;

      const rectX = x + w / 2;
      const rectY = y + h / 2;

      if (
        utils.circleCollides([shipX, shipY, r], [rectX, rectY, (w + 16) / 2])
      ) {
        const angleTowards = utils.getAngleTowards(
          [rectX, rectY],
          [shipX, shipY]
        );
        const [pushX, pushY] = utils.getVector(angleTowards, 1);
        shipPhysics.x += pushX * 3;
        shipPhysics.y += pushY * 3;
      }
    }
  }

  /**
   * @param {Entity} baseEntity
   * @param {Entity} projectileEntity
   */
  function checkBaseProjectileCollisions(baseEntity, projectileEntity) {
    /** @type {PhysicsBody} */
    const basePhysics = baseEntity.get(PhysicsBody);
    /** @type {HitHighlightRender} */
    const baseHitHighlightRender = baseEntity.get(HitHighlightRender);
    /** @type {HitCircle} */
    const baseCirc = projectileEntity.get(HitCircle);

    /** @type {HitCircle} */
    const circ = projectileEntity.get(HitCircle);
    /** @type {Projectile} */
    const proj = projectileEntity.get(Projectile);
    /** @type {PhysicsBody} */
    const projPhysics = projectileEntity.get(PhysicsBody);

    if (proj.allegiance === 'enemy') {
      return;
    }

    const { x, y } = basePhysics;

    if (
      utils.circleCollides(
        [x, y, baseCirc.circle.r],
        [projPhysics.x, projPhysics.y, circ.circle.r]
      )
    ) {
      projectileEntity.eject();
      baseHitHighlightRender.sprTimer.start();
      baseEntity.get(HitPoints).hp -= proj.dmg;
      return;
    }
  }

  /**
   * @param {Entity} crateEntity
   */
  function checkCratePlayerCollisions(crateEntity) {
    const playerEntity = getPlayerEntity(ecs);

    /** @type {Ship} */
    const ship1 = playerEntity.get(Ship);
    /** @type {Player} */
    const player = playerEntity.get(Player);
    /** @type {PhysicsBody} */
    const shipPhysics = playerEntity.get(PhysicsBody);

    /** @type {HitCircle} */
    const circ = crateEntity.get(HitCircle);
    /** @type {PhysicsBody} */
    const cratePhysics = crateEntity.get(PhysicsBody);

    for (const { r, offset } of ship1.hitCircles) {
      const [eX, eY] = utils.getVector(shipPhysics.angle, offset);
      const { x, y } = shipPhysics;

      if (
        utils.circleCollides(
          [x + eX, y + eY, r],
          [cratePhysics.x, cratePhysics.y, circ.circle.r]
        )
      ) {
        crateEntity.eject();
        player.crates++;
        return;
      }
    }
  }

  /**
   * @param {Entity} shipEntity1
   */
  const checkCollisionsWithShip = (shipEntity1) => {
    // setCamera();
    islands.iterate(checkShipIslandCollisions.bind(this, shipEntity1));
    projectiles.iterate(checkShipProjectileCollisions.bind(this, shipEntity1));
  };

  /**
   * @param {Entity} baseEntity
   */
  const checkCollisionsWithBase = (baseEntity) => {
    projectiles.iterate(checkBaseProjectileCollisions.bind(this, baseEntity));
  };

  this.update = () => {
    ships.iterate(checkCollisionsWithShip);
    ships.iterate(checkShipPlayerCollisions);
    bases.iterate(checkCollisionsWithBase);
    crates.iterate(checkCratePlayerCollisions);
  };
}

/**
 * @param {import('./ecs.js').ECS} ecs
 * @returns {object[]}
 */
export const get = (ecs) => {
  return [
    new Input(ecs),
    new UnderworldLegionSpawner(ecs),
    new ShipAi(ecs),
    new ExhaustParticleSpawner(ecs),
    new HitHighlightFlipper(ecs),
    new SpriteListFlipper(ecs),
    new WaterSimulation(ecs),
    new Movement(ecs),
    new TurretAI(ecs),
    new CameraMover(ecs),
    new RenderActors(ecs),
    new RenderUi(ecs),
    new Collisions(ecs),
    new LimitedLifetimeUpdater(ecs),
    new HitPointChecker(ecs),
  ];
};

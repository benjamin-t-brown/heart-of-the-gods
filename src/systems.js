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
  HitHighlightRender,
  Ai,
  HitPoints,
  Ui,
  SpriteListRender,
  UnderworldLegion,
  Turret,
} from './components.js';
import {
  createBase,
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
import {
  distance,
  getVector,
  normalize,
  randomInt,
  createSystem,
  isGameStarted,
  playSound,
} from './utils.js';
import { Collisions } from './systems.collisions.js';
import { Movement } from './systems.movement.js';
import { RenderActors } from './systems.render-actors.js';
import { RenderUi } from './systems.render-ui.js';
import { Input } from './systems.input.js';

/**
 * @typedef {object} Entity
 * @property {number} id
 * @property {(a: object) => object} get
 * @property {(a: object) => void} has
 * @property {(...a: object[]) => void} add
 * @property {(...a: object[]) => void} remove
 * @property {() => void} eject
 */

const PLAYER_PROJECTILE_COLOR = '#42CAFD';
const ENEMY_PROJECTILE_COLOR = '#F47E1B';

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
    renderable.opacity = normalize(
      lt.timer.getPctComplete(),
      0,
      1,
      lt.opacity.start,
      lt.opacity.end
    );

    renderable.scale = normalize(
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

    if (exhaust.spawnTimer.isComplete() && (physics.acc || physics.accRev)) {
      const [eX, eY] = getVector(physics.angle, -exhaust.r * 0.8);
      createExhaust(ecs, physics.x + eX, physics.y + eY);
      exhaust.spawnTimer.start();
    }
  };

  createSystem.bind(this)(selector, iterate);
}

/** @param {import('./ecs.js').ECS} ecs */
function UnderworldLegionSpawner(ecs) {
  const spawnShip = (minR, maxR, legion) => {
    const r = randomInt(minR, maxR);
    const angle = randomInt(0, 270) + 180 + 45;
    const [x, y] = getVector(angle, r);
    createEnemyShip(ecs, WORLD_WIDTH / 2 + x, WORLD_HEIGHT / 2 + y, 3);
    legion.numEnemies++;
  };

  this.update = () => {
    const legionEntity = getLegion(ecs);
    /** @type {UnderworldLegion} */
    const legion = legionEntity.get(UnderworldLegion);

    if (isGameStarted(ecs)) {
      if (legion.waveTimer.isComplete()) {
        console.log('SPAWN LEGION', legion.waveNumber + 5);
        for (let i = 0; i < legion.waveNumber + 5; i++) {
          spawnShip(WORLD_WIDTH, WORLD_WIDTH * 1.5, legion);
        }
        legion.waveNumber++;
        legion.waveTimer.start();
      }
    } else if (legion.numEnemies <= 0) {
      for (let i = 0; i < legion.waveNumber + 5; i++) {
        spawnShip(0, WORLD_WIDTH / 2, legion);
      }
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
        const [eX, eY] = getVector(angle, offset);
        const circleX = x + eX;
        const circleY = y + eY;
        const d = distance(circleX, circleY, xTurret, yTurret);
        targets.push([circleX, circleY, d]);
      }
    });

    turrets.iterate((entity) => {
      /** @type {PhysicsBody} */
      const { x, y } = entity.get(PhysicsBody);
      const d = distance(x, y, xTurret, yTurret);
      targets.push([x, y, d]);
    });

    const base = getBaseEntity(ecs);
    const basePhysics = base.get(PhysicsBody);
    const { x, y } = basePhysics;
    const d = distance(x, y, xTurret, yTurret);
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
    const distToPlayer = distance(
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
        const vec = getVector(physics.angle, 16);
        playSound('shoot1');
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

      const player = getPlayerEntity(ecs).get(Player);
      if (!isGameStarted(ecs) || player.gameOver) {
        continue;
      }

      if (updateTurret(turret, type, target)) {
        continue;
      }
    }
  };

  // /** @param {Entity} entity */
  // const updateStandaloneTurrets = (entity) => {
  //   /** @type {Turret} */
  //   const turret = entity.get(Turret);
  //   const target = acquirePlayerTarget(turret.physics.x, turret.physics.y);
  //   updateTurret(turret, 'enemy', target);
  // };

  this.update = () => {
    ships.iterate(updateShipTurrets);
    // turrets.iterate(updateStandaloneTurrets);
  };
}

/** @param {import('./ecs.js').ECS} ecs */
function ShipAi(ecs) {
  const selector = ecs.select(Ai, PhysicsBody);

  /** @param {Entity} entity */
  const iterate = (entity) => {
    /** @type {PhysicsBody} */
    const physics = entity.get(PhysicsBody);

    const player = getPlayerEntity(ecs).get(Player);
    if (!isGameStarted(ecs) || player.gameOver) {
      return;
    }

    const playerShipPhysics = getPlayerEntity(ecs).get(PhysicsBody);
    physics.turnTowards([playerShipPhysics.x, playerShipPhysics.y]);
    physics.acc = true;
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

      if (isPlayerEntity(entity)) {
        const playerEntity = getPlayerEntity(ecs);
        const player = playerEntity.get(Player);
        const playerRenderable = playerEntity.get(Renderable);
        playerRenderable.highlighted = true;
        const ui = getUiEntity(ecs).get(Ui);
        if (ui.endTimer.isComplete() && !player.gameOver) {
          playSound('end');
          player.gameOver = true;
          ui.endTimer.start();
          ui.endTimer.onCompletion().then(() => {
            newGame(ecs);
          });
          // for (let i = 0; i < 20; i++) {
          //   setTimeout(
          //     () =>
          //       createExplosion(
          //         ecs,
          //         x + utils.randomInt(-32, 32),
          //         y + utils.randomInt(-32, 32)
          //       ),
          //     i * 150
          //   );
          // }
        }
        ui.endTimer.update();
      } else if (isBaseEntity(entity)) {
        entity.eject();
        createExplosion(ecs, x, y);
        playSound('baseExpl');

        /**@type {Player}*/
        const player = getPlayerEntity(ecs).get(Player);

        /**
         * @type {number[][]}
         */
        const usedCoords = [...player.usedCoords];
        const ind = usedCoords.findIndex((c) => c[0] === x && c[1] === y);
        if (ind > -1) {
          usedCoords.splice(ind, 1);
        }
        const [baseX, baseY] = usedCoords[randomInt(0, usedCoords.length - 1)];
        createBase(ecs, baseX, baseY);
        const ui = getUiEntity(ecs).get(Ui);
        ui.setText('A new Heart has spawned!');
        player.score++;

        getPlayerEntity(ecs).get(Player).crates += 5;
      } else {
        playSound('sink');
        entity.eject();
        createExplosion(ecs, x, y);
        createCrate(ecs, x, y);
      }
    }
  };

  createSystem.bind(this)(selector, iterate);
}

/**
 * @param {import('./ecs.js').ECS} ecs
 * @returns {object[]}
 */
export const getSystems = (ecs) => {
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

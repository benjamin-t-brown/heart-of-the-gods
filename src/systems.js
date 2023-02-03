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
  Boost,
  Ghost,
} from './components.js';
import {
  createBase,
  createCrate,
  createEnemyShip,
  createExhaust,
  createExplosion,
  createGhost,
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
  removeEntity,
} from './utils.js';
import { Collisions } from './systems.collisions.js';
import { Movement } from './systems.movement.js';
import { RenderActors } from './systems.render-actors.js';
import { setLastScore } from './systems.render-ui.js';
import { Input } from './systems.input.js';
import { TurretAI } from './systems.turret.js';
import { render } from './render.js';

/**
 * @typedef {object} Entity
 * @property {number} id
 * @property {(a: object) => object} get
 * @property {(a: object) => boolean} has
 * @property {(...a: object[]) => void} add
 * @property {(...a: object[]) => void} remove
 * @property {() => void} eject
 */

/** @param {import('./ecs.js').ECS} ecs */
function LimitedLifetimeUpdater(ecs) {
  const selector = ecs.select(LimitedLifetime);
  const particles = ecs.select(LimitedLifetime, Renderable);

  /** @param {Entity} entity */
  const updateAndRemoveLifetimes = (entity) => {
    /** @type {LimitedLifetime} */
    const lt = entity.get(LimitedLifetime);

    if (lt.timer.isComplete()) {
      lt.cb();
      removeEntity(entity);
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
      createExhaust(ecs, physics.x + eX, physics.y + eY, exhaust.c);
      exhaust.spawnTimer.start();
    }
  };

  createSystem.bind(this)(selector, iterate);
}

/** @param {import('./ecs.js').ECS} ecs */
function UnderworldLegionSpawner(ecs) {
  const spawnSomething = (minR, maxR, legion, type, shipNum) => {
    const r = randomInt(minR, maxR);
    const angle = randomInt(0, 270) + 180 + 45;
    const [x, y] = getVector(angle, r);
    if (type === 'ship') {
      createEnemyShip(ecs, WORLD_WIDTH / 2 + x, WORLD_HEIGHT / 2 + y, shipNum);
    } else if (type === 'ghost') {
      createGhost(
        ecs,
        Math.random() > 0.5 ? -100 : WORLD_WIDTH + 100,
        WORLD_HEIGHT / 2 + y
      );
    }
    legion.numEnemies++;
  };

  this.update = () => {
    const player = getPlayerEntity(ecs).get(Player);
    if (player.gameOver) {
      return;
    }

    const legionEntity = getLegion(ecs);
    /** @type {UnderworldLegion} */
    const legion = legionEntity.get(UnderworldLegion);

    if (isGameStarted(ecs)) {
      if (legion.ghostTimer.isComplete()) {
        if (player.score >= 3) {
          for (let i = 0; i < legion.ghostNumber; i++) {
            console.log('Spawn ghost', player.score);
            spawnSomething(WORLD_WIDTH, WORLD_WIDTH * 1.5, legion, 'ghost');
          }
          legion.ghostTimer.start();
          legion.ghostNumber++;
        } else {
          legion.ghostTimer.start();
        }
      }

      if (legion.waveTimer.isComplete()) {
        console.log('Spawn ship');

        if (legion.numEnemies % 10 === 0) {
          legion.waveNumber++;
          if (legion.waveNumber > 4) {
            legion.waveNumber = 4;
            legion.waveMin++;
            if (legion.waveMin > 4) {
              legion.waveMin = 4;
            }
          }
        }

        spawnSomething(
          WORLD_WIDTH,
          WORLD_WIDTH * 1.5,
          legion,
          'ship',
          randomInt(legion.waveMin, legion.waveNumber)
        );

        if (legion.numEnemies > 50) {
          spawnSomething(
            WORLD_WIDTH,
            WORLD_WIDTH * 1.5,
            legion,
            'ship',
            randomInt(legion.waveMin, legion.waveNumber)
          );
        }

        legion.numEnemies++;
        legion.waveTimer.start();
      } else if (legion.numEnemies <= 0) {
        console.log('Spawn initial ships');
        legion.waveNumber = 1;
        legion.waveMin = 1;
        legion.ghostNumber = 1;
        for (let i = 0; i < 5; i++) {
          spawnSomething(0, WORLD_WIDTH / 2, legion, 'ship', 1);
        }
      }
    } else {
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
function EnemyAi(ecs) {
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

    render.camera = camera;
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
            setLastScore(player.score);
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
        removeEntity(entity);
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
        player.score++;
        const [baseX, baseY] = usedCoords[randomInt(0, usedCoords.length - 1)];
        createBase(ecs, baseX, baseY, player.score * 2);
        const ui = getUiEntity(ecs).get(Ui);
        ui.setText('A new Heart has spawned!');

        getPlayerEntity(ecs).get(Player).crates += 5;
      } else if (entity.has(Ship)) {
        playSound('sink');
        removeEntity(entity);
        createExplosion(ecs, x, y);
        createCrate(ecs, x, y);
      } else if (entity.has(Ghost)) {
        playSound('sink');
        removeEntity(entity);
        createExplosion(ecs, x, y);
      }
    }
  };

  createSystem.bind(this)(selector, iterate);
}

/** @param {import('./ecs.js').ECS} ecs */
function BoostApplicator(ecs) {
  const selector = ecs.select(PhysicsBody, Boost, Exhaust);

  /** @param {Entity} entity */
  const iterate = (entity) => {
    /** @type {Boost} */
    const boost = entity.get(Boost);
    /** @type {Exhaust} */
    const exhaust = entity.get(Exhaust);
    /** @type {PhysicsBody} */
    const physics = entity.get(PhysicsBody);

    if (boost.enabled && !boost.onCooldown) {
      boost.gauge.fill(0.12);

      exhaust.c = '#A1EF79';
      physics.accRate = 0.7;

      if (boost.gauge.isFull()) {
        boost.onCooldown = true;
      }
    } else {
      exhaust.resetColor();
      physics.resetAcc();
      if (boost.onCooldown && boost.gauge.getPct() === 0) {
        boost.onCooldown = false;
      }
    }
    boost.gauge.update();
  };

  createSystem.bind(this)(selector, iterate);
}

/** @param {import('./ecs.js').ECS} ecs */
function GhostMover(ecs) {
  const selector = ecs.select(PhysicsBody, Ghost, Renderable);

  /** @param {Entity} entity */
  const iterate = (entity) => {
    /** @type {Ghost} */
    const ghost = entity.get(Ghost);
    /** @type {PhysicsBody} */
    const physics = entity.get(PhysicsBody);
    /** @type {Renderable} */
    const renderable = entity.get(Renderable);

    const playerEntity = getPlayerEntity(ecs);
    const playerPhysics = playerEntity.get(PhysicsBody);

    const d = distance(playerPhysics.x, playerPhysics.y, physics.x, physics.y);

    if (d > 2000) {
      ghost.timer.start();
    }

    const mult = 5;
    const pct = ghost.timer.getPctComplete();
    const offset = mult * Math.sin(normalize(pct, 0, 1, 0, 2 * Math.PI));
    physics.y += offset;

    if (ghost.timer.isComplete()) {
      ghost.timer.start();

      if (d < 1000) {
        playSound('ghost');
      }
    }

    renderable.flipped = physics.vx > 0;
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
    new EnemyAi(ecs),
    new GhostMover(ecs),
    new BoostApplicator(ecs),
    new ExhaustParticleSpawner(ecs),
    new HitHighlightFlipper(ecs),
    new SpriteListFlipper(ecs),
    new WaterSimulation(ecs),
    new Movement(ecs),
    new TurretAI(ecs),
    new CameraMover(ecs),
    new RenderActors(ecs),
    // new RenderUi(ecs),
    new Collisions(ecs),
    new LimitedLifetimeUpdater(ecs),
    new HitPointChecker(ecs),
  ];
};

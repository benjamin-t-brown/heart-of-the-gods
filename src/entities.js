import {
  Ai,
  Camera,
  Crate,
  Exhaust,
  HitCircle,
  HitHighlightRender,
  HitPoints,
  HitRectangle,
  LimitedLifetime,
  PhysicsBody,
  Player,
  Projectile,
  Renderable,
  Ship,
  SpriteListRender,
  TILE_SCALE,
  Turret,
  Ui,
  UnderworldLegion,
  Water,
  WORLD_HEIGHT,
  WORLD_WIDTH,
} from './components.js';
import * as utils from './utils.js';

const Z_PLAYER = 10;
const Z_WATER = 0;
const Z_EXHAUST = 9;
const Z_PARTICLE = 11;
const Z_ISLAND = 2;
const Z_ISLAND_TURRET = 3;

let playerShipId = '';
export const isPlayerEntity = (entity) => entity.id === playerShipId;
export const getPlayerEntity = (ecs) => ecs.get(playerShipId);

let baseId = '';
export const isBaseEntity = (entity) => entity.id === baseId;
export const getBaseEntity = (ecs) => ecs.get(baseId);

let uiId = '';
export const getUiEntity = (ecs) => ecs.get(uiId);

let legionId = '';
export const getLegion = (ecs) => ecs.get(legionId);

export const newGame = (ecs) => {
  ecs.reset();

  createPlayer(ecs);
  createWater(ecs);
  createUi(ecs);
  createLegion(ecs);
  createEnemyShip(ecs, WORLD_WIDTH / 2, WORLD_HEIGHT / 2 + 500, 3);

  const usedCoords = [];
  for (let i = 0; i < 35; i++) {
    const [x, y] = utils.generateCoords(
      64,
      WORLD_WIDTH - 96,
      64,
      WORLD_HEIGHT - 96,
      TILE_SCALE * 16 * 3,
      usedCoords
    );
    createIsland(ecs, x, y);
  }

  const [baseX, baseY] = usedCoords[utils.randomInt(0, usedCoords.length - 1)];
  createBase(ecs, baseX, baseY);
};

/**
 * @param {import('./ecs.js').ECS} ecs
 */
export function createPlayer(ecs) {
  const player = new Player();
  const ship = new Ship(
    [2, 1, 0],
    [new Turret({ sprNum: 22, ms: 1000, dmg: 1, offset: 32, range: 300 })]
  );
  const physics = new PhysicsBody(WORLD_WIDTH / 2, WORLD_HEIGHT / 2 + 256);
  const renderable = new Renderable({ ship, scale: 2, z: Z_PLAYER });

  const ent = ecs.create();
  ent.add(
    player,
    ship,
    renderable,
    physics,
    new Exhaust(48),
    new Camera(),
    new HitHighlightRender(),
    new HitPoints(50)
  );
  playerShipId = ent.id;
}

/**
 * @param {import('./ecs.js').ECS} ecs
 * @param {number} x
 * @param {number} y
 */
export const createBase = (ecs, x, y) => {
  const ent = ecs.create();
  ent.add(
    new Renderable({ scale: 6, z: Z_ISLAND_TURRET }),
    new HitCircle(utils.Circ(x, y, 44)),
    // new FlipRender(500),
    new SpriteListRender(['spr_21', 'spr_21_f'], 500),
    new PhysicsBody(x, y),
    new HitHighlightRender(),
    new HitPoints(500)
  );
  baseId = ent.id;
};

/**
 * @param {import('./ecs.js').ECS} ecs
 * @param {number} x
 * @param {number} y
 * @param {number} sprNum
 */
export const createEnemyShip = (ecs, x, y, sprNum) => {
  const spr = sprNum ?? 3;

  /** @type {Record<any, [number[], any, number]>} */
  const obj = {
    3: [
      [spr, spr],
      [
        new Turret({
          sprNum: 22,
          ms: 1000,
          dmg: 1,
          offset: 0,
          range: 300,
        }),
      ],
      2,
    ],
  };

  /** @type {any} */
  const args = obj[spr] ?? obj[3];

  // @ts-ignore
  const ship = new Ship(args[0], args[1], 8);
  const physics = new PhysicsBody(x, y);
  const renderable = new Renderable({ ship, scale: 2, z: Z_PLAYER });

  const ent = ecs.create();
  ent.add(
    ship,
    renderable,
    physics,
    new Exhaust(16),
    new HitHighlightRender(),
    new HitPoints(args[2]),
    new Ai()
  );
};

/**
 * @param {import('./ecs.js').ECS} ecs
 * @param {number} x
 * @param {number} y
 * @param {number} sprNum
 */
export const createEnemyTurret = (ecs, x, y, sprNum) => {
  const physics = new PhysicsBody(x, y);
  const renderable = new Renderable({
    spriteName: 'spr ' + sprNum,
    scale: 2,
    z: Z_PLAYER,
  });
  const turret = new Turret({
    sprNum: 22,
    ms: 1000,
    dmg: 1,
    offset: 0,
    range: 300,
  });

  const ent = ecs.create();
  ent.add(
    turret,
    renderable,
    physics,
    new HitCircle(utils.Circ(x, y, 32)),
    new HitHighlightRender(),
    new HitPoints(5)
  );
};

/**
 * @param {import('./ecs.js').ECS} ecs
 * @param {number} x
 * @param {number} y
 */
export const createExhaust = (ecs, x, y) => {
  const physics = new PhysicsBody(x, y);
  const ent = ecs.create();
  ent.add(
    new Renderable({
      circle: { r: 7, color: '#92F4FF' },
      z: Z_EXHAUST,
    }),
    physics,
    new LimitedLifetime({
      duration: 700,
      opacity: {
        start: 0.5,
        end: 0,
      },
      scale: {
        start: 1,
        end: 4,
      },
    })
  );
};

/**
 * @param {import('./ecs.js').ECS} ecs
 * @param {number} x
 * @param {number} y
 */
export const createExplosion = (ecs, x, y) => {
  const physics = new PhysicsBody(x, y);
  const ent = ecs.create();
  ent.add(
    new Renderable({
      circle: { r: 10, color: 'brown' },
      z: Z_EXHAUST,
    }),
    physics,
    new LimitedLifetime({
      duration: 1000,
      opacity: {
        start: 1,
        end: 0,
      },
      scale: {
        start: 1,
        end: 4,
      },
    })
  );
};

/**
 * @param {import('./ecs.js').ECS} ecs
 * @param {number} x
 * @param {number} y
 * @param {string} spriteName
 * @param {number} scale
 * @returns {string}
 */
export const createTile = (ecs, x, y, spriteName, scale) => {
  const physics = new PhysicsBody(x, y);
  const ent = ecs.create();
  ent.add(new Renderable({ spriteName, scale, z: Z_WATER }), physics);
  return ent.id;
};

/**
 * @param {import('./ecs.js').ECS} ecs
 */
export const createWater = (ecs) => {
  const ent = ecs.create();
  ent.add(new Water(ecs));
};

/**
 * @param {import('./ecs.js').ECS} ecs
 * @param {number} x
 * @param {number} y
 * @param {number} sprNum
 * @param {number} scale
 * @param {boolean} [useHitRectangle]
 */
export const createIslandTile = (ecs, x, y, sprNum, scale, useHitRectangle) => {
  const ent = ecs.create();
  ent.add(
    new Renderable({ spriteName: 'spr_' + sprNum, scale, z: Z_ISLAND }),
    new PhysicsBody(x, y)
  );
  if (useHitRectangle) {
    const hitRectSize = 16 * TILE_SCALE * 2;

    ent.add(
      new HitRectangle(
        utils.Rect(
          x - hitRectSize / 2,
          y - hitRectSize / 2,
          hitRectSize,
          hitRectSize
        )
      )
    );
  }
};

/**
 * @param {import('./ecs.js').ECS} ecs
 * @param {number} x
 * @param {number} y
 */
export const createIsland = (ecs, x, y) => {
  let startCtr = 10;

  createIslandTile(ecs, x, y, 15, TILE_SCALE, true);
  for (let i = -1; i <= 1; i++) {
    for (let j = -1; j <= 1; j++) {
      startCtr++;
      if (i === 0 && j === 0) {
        continue;
      }
      // const spr = 'spr_' + startCtr;
      createIslandTile(
        ecs,
        x + TILE_SCALE * 16 * j,
        y + TILE_SCALE * 16 * i,
        startCtr,
        TILE_SCALE
      );
    }
  }
};

export const createProjectile = (
  ecs,
  allegiance,
  { x, y, angle, spd, dmg, ms, col }
) => {
  const ent = ecs.create();
  const physics = new PhysicsBody(x, y);
  physics.dragOn = false;
  physics.angle = angle;
  const [vx, vy] = utils.getVector(angle, spd);
  physics.setV(vx, vy);
  ent.add(
    new Projectile(dmg, allegiance),
    new Renderable({
      circle: {
        r: 5,
        color: col,
      },
      z: Z_PARTICLE,
    }),
    new LimitedLifetime({
      duration: ms,
    }),
    physics,
    new HitCircle(utils.Circ(x, y, 5))
  );
};

export const createUi = (ecs) => {
  const ent = ecs.create();
  ent.add(new Ui());
  uiId = ent.id;
};

export const createLegion = (ecs) => {
  const ent = ecs.create();
  ent.add(new UnderworldLegion());
  legionId = ent.id;
};

/**
 * @param {import('./ecs.js').ECS} ecs
 * @param {number} x
 * @param {number} y
 */
export const createCrate = (ecs, x, y) => {
  const physics = new PhysicsBody(x, y);
  const ent = ecs.create();
  ent.add(
    new Renderable({
      scale: 2,
      z: Z_EXHAUST,
    }),
    physics,
    new Crate(),
    new SpriteListRender(['spr_8', 'spr_9'], 400),
    new HitCircle(utils.Circ(x, y, 16)),
    new LimitedLifetime({
      duration: 60 * 1000 * 2,
      scale: {
        start: 2,
        end: 2,
      },
    })
  );
};

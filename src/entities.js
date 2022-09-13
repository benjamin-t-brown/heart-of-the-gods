import {
  Ai,
  Boost,
  Camera,
  Crate,
  Exhaust,
  Ghost,
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
import { Circ, distance, getVector, randomInt, Rect } from './utils.js';

const Z_PLAYER = 10;
const Z_WATER = 0;
const Z_EXHAUST = 9;
const Z_PARTICLE = 11;
const Z_ISLAND = 2;
const Z_ISLAND_TURRET = 3;

export const PLAYER_PROJECTILE_COLOR = '#42CAFD';
export const ENEMY_PROJECTILE_COLOR = '#F47E1B';

let playerShipId = '';
export const isPlayerEntity = (entity) => entity.id === playerShipId;
/**
 * @param {import('./ecs.js').ECS} ecs
 * @returns {import('./systems.js').Entity} entity
 */
export const getPlayerEntity = (ecs) => ecs.get(playerShipId);

let baseId = '';
export const isBaseEntity = (entity) => entity.id === baseId;
/**
 * @param {import('./ecs.js').ECS} ecs
 * @returns {import('./systems.js').Entity} entity
 */
export const getBaseEntity = (ecs) => ecs.get(baseId);

let uiId = '';
/**
 * @param {import('./ecs.js').ECS} ecs
 * @returns {import('./systems.js').Entity} entity
 */
export const getUiEntity = (ecs) => ecs.get(uiId);

let legionId = '';
/**
 * @param {import('./ecs.js').ECS} ecs
 * @returns {import('./systems.js').Entity} entity
 */
export const getLegion = (ecs) => ecs.get(legionId);

/**
 * @param {number} x
 * @param {number} y
 * @param {number} minDist
 * @param {number[][]} coords
 * @returns {boolean}
 */
const isInvalidLocation = (x, y, minDist, coords) => {
  for (const [x2, y2] of coords) {
    const d = distance(x, y, x2, y2);
    if (d < minDist) {
      return true;
    }
  }
  return false;
};

/**
 * @param {number} minR
 * @param {number} maxR
 * @param {number} minDistBetween
 * @param {number[][]} usedCoords
 * @returns {number[]}
 */
export const generateCoords = (minR, maxR, minDistBetween, usedCoords) => {
  let nextX;
  let nextY;
  let ctr = 0;
  do {
    const r = randomInt(minR, maxR);
    const angle = randomInt(0, 270) + 180 + 45 - 360;
    const [x, y] = getVector(angle, r);
    nextX = WORLD_WIDTH / 2 + x;
    nextY = WORLD_HEIGHT / 2 + y;
    ctr++;
  } while (
    ctr < 10 &&
    isInvalidLocation(nextX, nextY, minDistBetween, usedCoords)
  );

  if (ctr >= 10) {
    return [0, 0];
  }

  const ret = [nextX, nextY];
  usedCoords.push(ret);
  return ret;
};

/**
 * @param {import('./ecs.js').ECS} ecs
 */
export const newGame = (ecs) => {
  ecs.reset();

  createPlayer(ecs);
  createWater(ecs);
  createUi(ecs);
  createLegion(ecs);

  // createGhost(ecs, WORLD_WIDTH / 2 + 300, WORLD_HEIGHT / 2 + WORLD_HEIGHT / 4);

  const usedCoords = getPlayerEntity(ecs).get(Player).usedCoords;
  for (let i = 0; i < 35; i++) {
    const [x, y] = generateCoords(
      0,
      (WORLD_WIDTH - 96) / 2,
      TILE_SCALE * 16 * 3,
      usedCoords
    );
    createIsland(ecs, x, y);
  }

  const [baseX, baseY] = usedCoords[randomInt(0, usedCoords.length - 1)];
  createBase(ecs, baseX, baseY, 0);
};

/**
 * @param {import('./ecs.js').ECS} ecs
 */
export function createPlayer(ecs) {
  const player = new Player();
  const ship = new Ship(
    [2, 1, 0],
    [
      new Turret({
        sprNum: 22,
        ms: 1000,
        dmg: 1,
        offset: 32,
        range: 300,
        prjSpd: 15,
        prjColor: PLAYER_PROJECTILE_COLOR,
        prjSz: 5,
      }),
    ]
  );
  const physics = new PhysicsBody(
    WORLD_WIDTH / 2,
    WORLD_HEIGHT / 2 + WORLD_HEIGHT / 4
  );
  physics.angleRate = 4;
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
    new HitPoints(50),
    new Boost()
  );
  playerShipId = ent.id;
}

/**
 * @param {import('./ecs.js').ECS} ecs
 * @param {number} x
 * @param {number} y
 * @param {number} hpBonus
 */
export const createBase = (ecs, x, y, hpBonus) => {
  const ent = ecs.create();
  ent.add(
    new Renderable({ scale: 6, z: Z_ISLAND_TURRET }),
    new HitCircle(Circ(x, y, 44)),
    new SpriteListRender(['spr_21', 'spr_21_f'], 500),
    new PhysicsBody(x, y),
    new HitHighlightRender(),
    new HitPoints(10 + hpBonus)
  );
  baseId = ent.id;
};

/**
 * @typedef {object} TurretTemplate
 * @property {number} sprNum
 * @property {number} ms
 * @property {number} dmg
 * @property {number} offset
 * @property {number} range
 */

/**
 * @typedef {object} ShipTemplate
 * @property {number[]} sprites
 * @property {TurretTemplate[]} turrets
 * @property {number} hp
 * @property {number} [spriteR]
 */

/**
 * @param {import('./ecs.js').ECS} ecs
 * @param {number} x
 * @param {number} y
 * @param {number} sprNum
 */
export const createEnemyShip = (ecs, x, y, sprNum) => {
  /**
   * @type {Record<number, ShipTemplate>}
   */
  const ships = {
    1: {
      sprites: [3, 3],
      turrets: [
        {
          sprNum: 22,
          ms: 1000,
          dmg: 1,
          offset: 0,
          range: 300,
        },
      ],
      hp: 1,
      spriteR: 8,
    },
    2: {
      sprites: [3, 3, 3],
      turrets: [
        {
          sprNum: 22,
          ms: 1000,
          dmg: 1,
          offset: 0,
          range: 300,
        },
        {
          sprNum: 22,
          ms: 900,
          dmg: 1,
          offset: 0,
          range: 400,
        },
      ],
      hp: 3,
      spriteR: 8,
    },
    3: {
      sprites: [3, 3, 3],
      turrets: [
        {
          sprNum: 24,
          ms: 700,
          dmg: 2,
          offset: 0,
          range: 350,
        },
      ],
      hp: 10,
      spriteR: 8,
    },
    4: {
      sprites: [3, 3, 3, 3],
      turrets: [
        {
          sprNum: 24,
          ms: 700,
          dmg: 2,
          offset: 0,
          range: 400,
        },
        {
          sprNum: 24,
          ms: 700,
          dmg: 2,
          offset: 0,
          range: 400,
        },
      ],
      hp: 20,
      spriteR: 8,
    },
  };

  const shipTemplate = ships[sprNum];

  // @ts-ignore
  const ship = new Ship(
    shipTemplate.sprites,
    shipTemplate.turrets.map(
      (turretArgs) =>
        new Turret({
          ...turretArgs,
          prjColor: ENEMY_PROJECTILE_COLOR,
          prjSpd: 10,
          prjSz: 5,
        })
    ),
    shipTemplate.spriteR ?? 8
  );
  const physics = new PhysicsBody(x, y);
  const renderable = new Renderable({ ship, scale: 2, z: Z_PLAYER });

  const ent = ecs.create();
  ent.add(
    ship,
    renderable,
    physics,
    new Exhaust(16),
    new HitHighlightRender(),
    new HitPoints(shipTemplate.hp),
    new Ai()
  );
};

/**
 * @param {import('./ecs.js').ECS} ecs
 * @param {number} x
 * @param {number} y
 */
export const createGhost = (ecs, x, y) => {
  // @ts-ignore
  const physics = new PhysicsBody(x, y);
  const renderable = new Renderable({
    spriteName: 'spr_20',
    scale: 4,
    z: Z_PLAYER,
    useHeading: false,
  });
  physics.accRate = 0.5;
  physics.angleRate = 5;

  const ent = ecs.create();
  ent.add(
    renderable,
    physics,
    new HitHighlightRender(),
    new HitPoints(15),
    new HitCircle(Circ(0, 0, 28)),
    new Ai(),
    new Ghost()
  );
};

/**
 * @param {import('./ecs.js').ECS} ecs
 * @param {number} x
 * @param {number} y
 * @param {number} sprNum
 */
// export const createEnemyTurret = (ecs, x, y, sprNum) => {
//   const physics = new PhysicsBody(x, y);
//   const renderable = new Renderable({
//     spriteName: 'spr ' + sprNum,
//     scale: 2,
//     z: Z_PLAYER,
//   });
//   const turret = new Turret({
//     sprNum: 22,
//     ms: 1000,
//     dmg: 1,
//     offset: 0,
//     range: 300,
//     prjColor: ENEMY_PROJECTILE_COLOR,
//     prjSz: 5,
//     prjSpd: 10,
//   });

//   const ent = ecs.create();
//   ent.add(
//     turret,
//     renderable,
//     physics,
//     new HitCircle(Circ(x, y, 32)),
//     new HitHighlightRender(),
//     new HitPoints(5)
//   );
// };

/**
 * @param {import('./ecs.js').ECS} ecs
 * @param {number} x
 * @param {number} y
 * @param {string} c
 */
export const createExhaust = (ecs, x, y, c) => {
  const physics = new PhysicsBody(x, y);
  const ent = ecs.create();
  ent.add(
    new Renderable({
      circle: { r: 7, color: c },
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
      circle: { r: 10, color: '#A05B53' },
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
        Rect(x - hitRectSize / 2, y - hitRectSize / 2, hitRectSize, hitRectSize)
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
  { x, y, angle, spd, dmg, ms, col, sz }
) => {
  const ent = ecs.create();
  const physics = new PhysicsBody(x, y);
  physics.dragOn = false;
  physics.angle = angle;
  const [vx, vy] = getVector(angle, spd);
  physics.setV(vx, vy);
  ent.add(
    new Projectile(dmg, allegiance),
    new Renderable({
      circle: {
        r: sz,
        color: col,
      },
      z: Z_PARTICLE,
    }),
    new LimitedLifetime({
      duration: ms,
    }),
    physics,
    new HitCircle(Circ(x, y, 5))
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
    new HitCircle(Circ(x, y, 16)),
    new LimitedLifetime({
      duration: 60 * 1000,
      scale: {
        start: 2,
        end: 2,
      },
    })
  );
};

// @ts-check

import { draw } from './draw.js';
import { createTile } from './entities.js';
import { getAngleTowards, getVector, randomInt, Timer } from './utils.js';

export const TILE_SCALE = 4;

const WORLD_WIDTH_TILES = 64;
const WORLD_HEIGHT_TILES = 64;

export const WORLD_WIDTH = WORLD_WIDTH_TILES * 16 * TILE_SCALE;
export const WORLD_HEIGHT = WORLD_HEIGHT_TILES * 16 * TILE_SCALE;

export class PhysicsBody {
  vx = 0;
  vy = 0;
  ax = 0;
  ay = 0;
  mass = 1;
  angle = 0;
  angleRate = 2;
  acc = false;
  accRev = false;
  accRate = 0.3;
  coeff = 0.1;
  dragOn = true;

  /**
   * @param {number} x
   * @param {number} y
   */
  constructor(x, y) {
    this.x = x;
    this.y = y;
  }

  /**
   * @param {number} vx
   * @param {number} vy
   */
  setV(vx, vy) {
    this.vx = vx;
    this.vy = vy;
  }

  /**
   * @param {number} angle
   */
  setAngle(angle) {
    if (angle < 0) {
      angle = angle + 360;
    } else if (angle > 360) {
      angle = angle - 360;
    }
    this.angle = angle;
  }

  /**
   * @param {[number, number]} pos
   */
  lookAt(pos) {
    this.setAngle(getAngleTowards([this.x, this.y], pos));
  }

  /**
   * @param {[number, number]} pos
   * @returns {boolean | undefined}
   */
  turnTowards(pos) {
    const h = getAngleTowards([this.x, this.y], pos);
    if (this.angle <= h) {
      if (Math.abs(this.angle - h) < 180) {
        this.turn('r');
      } else {
        this.turn('l');
      }
    } else {
      if (Math.abs(this.angle - h) < 180) {
        this.turn('l');
      } else {
        this.turn('r');
      }
    }
    if (this.angle === h) {
      return true;
    }
  }

  /**
   * @param {'l' | 'r'} d
   */
  turn(d) {
    const frameRatio = draw.fm;
    const vr = this.angleRate * frameRatio;
    if (d == 'l') {
      this.setAngle(this.angle - vr);
    } else if (d == 'r') {
      this.setAngle(this.angle + vr);
    }
  }
}

export class HitCircle {
  /**
   * @type {import('./utils.js').Circle} circle
   */
  circle;

  /**
   * @param {import('./utils.js').Circle} circle
   */
  constructor(circle) {
    this.circle = circle;
  }
}

export class HitRectangle {
  /**
   * @param {import('./utils.js').Rectangle} rect
   */
  constructor(rect) {
    this.rect = rect;
  }
}

export class Renderable {
  /** @type {string} */
  spriteName;
  flipped = false;
  highlighted = false;
  opacity = 1;
  /** @type {number} */
  z;

  /** @type {number} */
  scale;

  /**
   * @typedef {object} RenderCircle
   * @property {number} r
   * @property {string} color
   */
  circle;

  /**
   * @typedef {object} RenderRectangle
   * @property {number} w
   * @property {number} h
   * @property {string} color
   */
  rectangle;

  /**
   * @type {Ship | undefined}
   */
  ship;

  /**
   * @param {object} [args]
   * @param {string} [args.spriteName]
   * @param {RenderCircle} [args.circle]
   * @param {RenderRectangle} [args.rectangle]
   * @param {number} [args.z]
   * @param {number} [args.scale]
   * @param {Ship} [args.ship]
   */
  constructor({ spriteName, circle, rectangle, z, scale, ship } = {}) {
    this.spriteName = spriteName ?? '';
    this.circle = circle;
    this.rectangle = rectangle;
    this.z = z ?? 0;
    this.scale = scale ?? 1;
    this.ship = ship;
  }
}

export class LimitedLifetime {
  /** @type {Timer} */
  timer;

  /**
   * @typedef {object} MinMax
   * @property {number} start
   * @property {number} end
   */

  /** @type {MinMax}*/
  opacity = {
    start: 1,
    end: 1,
  };

  /** @type {MinMax}*/
  scale = {
    start: 1,
    end: 1,
  };

  /**
   * @param {object} args
   * @param {number} args.duration
   * @param {MinMax} [args.opacity]
   * @param {MinMax} [args.scale]
   */
  constructor({ duration, scale, opacity }) {
    this.timer = new Timer(duration);
    this.opacity = opacity ?? this.opacity;
    this.scale = scale ?? this.scale;
  }
}

export class Turret {
  /**
   * @param {object} args
   * @param {number} args.sprNum
   * @param {number} args.ms
   * @param {number} args.dmg
   * @param {number} args.offset
   * @param {number} args.range
   */
  constructor({ sprNum, ms, dmg, offset, range }) {
    this.sprNum = sprNum;
    this.timer = new Timer(ms);
    this.sprTimer = new Timer(100);
    this.dmg = dmg;
    this.offset = offset;
    this.physics = new PhysicsBody(0, 0);
    this.range = range;
    this.level = 1;
  }
}

export class Ship {
  /**
   * @typedef {object} CircleOffset
   * @property {number} r
   * @property {number} offset
   */
  /**
   * @type {CircleOffset[]}
   */
  hitCircles = [];
  /**
   * @type {Turret[]}
   */
  turrets;

  /** @type {number[]} */
  spriteNumbs;

  spriteR;

  /**
   * @param {number[]} sprites
   * @param {Turret[]} turrets
   * @param {number} spriteR
   */
  constructor(sprites, turrets, spriteR = 16) {
    const numSprites = sprites.length;
    this.spriteNumbs = sprites;
    this.turrets = turrets;
    this.spriteR = spriteR;
    this.buildHitCircles(numSprites);
  }

  /**
   * @param {number} numSprites
   */
  buildHitCircles(numSprites) {
    this.hitCircles = [];
    let startingOffset = 0;
    if (numSprites > 1) {
      startingOffset = -this.spriteR * (numSprites - 1);
    }

    for (let i = 0; i < numSprites; i++) {
      this.hitCircles.push({
        r: 16,
        offset: i * (this.spriteR * 2) + startingOffset,
      });
    }
  }

  /** */
  addTurret() {
    this.turrets.push(
      new Turret({
        sprNum: 22,
        ms: 1000,
        dmg: 1,
        offset: 32 * (this.turrets.length + 1),
        range: 300,
      })
    );
    const arr = this.spriteNumbs;
    this.spriteNumbs = [...arr.slice(0, -2), 10, ...arr.slice(-2)];
    this.buildHitCircles(this.spriteNumbs.length);
  }

  /**
   * @returns {boolean}
   */
  upgradeTurret() {
    /** @type {any}*/
    let lowestTurret;
    for (const turret of this.turrets) {
      if (!lowestTurret || turret.level < lowestTurret.level) {
        lowestTurret = turret;
      }
    }
    if (lowestTurret.level < 4) {
      lowestTurret.level++;
      lowestTurret.sprNum += 2;
      lowestTurret.dmg++;
      lowestTurret.range += 5;
      lowestTurret.timer.start(lowestTurret.timer.duration - 100);
      return true;
    }

    return false;
  }

  /**
   * @param {number} angle
   * @returns {{
   *   spr: string,
   *   r: number,
   *   offset: number[]
   * }[]}
   */
  getHitCirclePositions(angle) {
    const ret = [];
    for (const i in this.hitCircles) {
      ret.push({
        r: this.hitCircles[i].r,
        offset: getVector(angle, this.hitCircles[i].offset),
        spr: 'spr_' + this.spriteNumbs[i],
      });
    }
    return ret;
  }

  /**
   * @param {number} angle
   * @returns {(Turret & {
   *   offset: number[]
   *   spr: string
   * })[]}
   */
  getTurretPositions(angle) {
    /**
     * @type {any[]}
     */
    const ret = [];
    for (const i in this.turrets) {
      const t = this.turrets[i];
      ret.push({
        ...t,
        offset: getVector(angle, this.hitCircles[i].offset),
        spr: 'spr_' + (t.sprNum + (t.sprTimer.isComplete() ? 0 : 1)),
      });
    }
    return ret;
  }
}

export class Player {
  /** @type {Record<string, boolean>} */
  keys = {};
  score = 0;
  crates = 0;
  gameOver = false;
  gameStarted = false;
  /** @type {number[][]}*/
  usedCoords = [];

  /** @param {string} key */
  setKeyDown(key) {
    this.keys[key] = true;
  }
  /** @param {string} key */
  setKeyUp(key) {
    this.keys[key] = false;
  }
}

export class Exhaust {
  spawnTimer = new Timer(100);
  r;
  /** @param {number} r*/
  constructor(r) {
    this.r = r;
  }
}

export class HitHighlightRender {
  /** */
  constructor() {
    this.sprTimer = new Timer(100);
    this.sprTimer.timestampStart = 0;
  }
}

export class SpriteListRender {
  /**
   * @param {string[]} sprites
   * @param {number} ms
   */
  constructor(sprites, ms) {
    this.sprTimer = new Timer(ms);
    this.sprTimer.timestampStart = -9999;

    this.i = 0;
    this.sprites = sprites;
  }
}

export class Ai {}

export class Water {
  /**
   * @typedef {object} Tile
   * @property {string} id
   * @property {number} spr
   * @property {Timer} timer
   */

  /** @type {Tile[]} */
  tiles = [];

  scale = TILE_SCALE;

  width = WORLD_WIDTH_TILES;
  height = WORLD_HEIGHT_TILES;

  /** @param {import('./ecs.js').ECS} ecs */
  constructor(ecs) {
    for (let i = 0; i < this.height; i++) {
      for (let j = 0; j < this.width; j++) {
        /** @type {Tile} */
        const tile = {
          id: '',
          spr: 0,
          timer: new Timer(randomInt(100, 20000)),
        };
        this.tiles.push(tile);
        const id = createTile(
          ecs,
          j * this.scale * 16,
          i * this.scale * 16,
          this.getSpriteName(tile),
          this.scale
        );
        tile.id = id;
      }
    }
  }

  /** @param {Tile} tile */
  incTile(tile) {
    tile.spr = (tile.spr + 1) % 4;
  }

  /**
   * @param {Tile} tile
   * @returns {string}
   */
  getSpriteName(tile) {
    return 'spr_' + (tile.spr + 4);
  }

  /** @param {Tile} tile */
  resetTileTimer(tile) {
    tile.timer.start(tile.spr === 0 ? randomInt(5000, 20000) : 150);
  }
}

export class Camera {
  x = 0;
  y = 0;
  w = draw.SCREEN_WIDTH;
  h = draw.SCREEN_HEIGHT;
}

export class Projectile {
  /**
   * @param {number} dmg
   * @param {string} allegiance
   */
  constructor(dmg, allegiance) {
    this.dmg = dmg;
    this.allegiance = allegiance;
  }
}

export class HitPoints {
  /**
   * @param {number} hp
   */
  constructor(hp) {
    this.hp = this.maxHp = hp;
  }
}

export class UnderworldLegion {
  waveNumber = 0;
  numEnemies = 0;
  waveTimer = new Timer(20000);

  /** */
  constructor() {
    this.waveTimer.timestampStart = -this.waveTimer.duration;
  }
}

export class Ui {
  costUpgrade = 5;
  costNew = 10;
  costHeal = 5;

  textTimer = new Timer(3000);
  endTimer = new Timer(4000);

  textFlashTimer = new Timer(250);
  textFlashI = -1;
  textFlashColor = '';

  /** */
  constructor() {
    this.endTimer.timestampStart = -9999;
    this.text = '';
  }

  /**
   * @param {string} text
   */
  setText(text) {
    this.text = text;
    this.textTimer.start();
  }

  /**
   * @param {number} i
   * @param {string} c
   */
  setTextFlash(i, c) {
    this.textFlashTimer.start();
    this.textFlashI = i;
    this.textFlashColor = c;
  }
}

export class Crate {}

export const getComponents = () => {
  return [
    PhysicsBody,
    Renderable,
    HitCircle,
    HitRectangle,
    LimitedLifetime,
    Ship,
    Turret,
    HitHighlightRender,
    SpriteListRender,
    Player,
    Exhaust,
    Ai,
    Water,
    Camera,
    Projectile,
    HitPoints,
    Ui,
    UnderworldLegion,
    Crate,
  ];
};

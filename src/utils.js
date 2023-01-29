import { Player } from './components.js';
import { draw } from './draw.js';
import { getPlayerEntity } from './entities.js';
import { render } from './render.js';
import { setVolume, zzfx } from './zzfx.js';

const getNow = () => window.performance.now();

/** @param {import('./systems.js').Entity} entity */
export const removeEntity = (entity) => {
  render.removeRenderObject(entity);
  entity.eject();
};

const timers = [];
export class Timer {
  /**
   * @param {number} duration duration in ms
   */
  constructor(duration) {
    this.timestampStart = getNow();
    this.timestampPause = 0;
    this.duration = duration;
    this.paused = false;
    this.awaits = [];
    timers.push(this);
  }
  // /** */
  // static pauseAll() {
  //   timers.forEach((t) => t.pause());
  // }
  // /** */
  // static unpauseAll() {
  //   timers.forEach((t) => t.unpause());
  // }
  // /** */
  // static clearTimers() {
  //   timers.length = 0;
  // }
  /**
   * @param {number} [duration]
   */
  start(duration) {
    if (this.paused) {
      this.timestampPause = getNow();
      this.unpause();
    }
    this.timestampStart = getNow();
    this.duration = duration ?? this.duration;
  }
  /** */
  pause() {
    if (!this.paused) {
      this.paused = true;
      this.timestampPause = getNow();
    }
  }
  /** */
  unpause() {
    if (this.paused) {
      this.paused = false;
      this.updateStart(getNow() - this.timestampPause);
    }
  }
  /**
   * @param {number} offsetDuration
   */
  updateStart(offsetDuration) {
    this.timestampStart += offsetDuration;
  }
  /** */
  update() {
    if (this.isComplete()) {
      this.awaits.forEach((r) => r());
      this.awaits = [];
    }
  }

  /**
   * @returns {boolean}
   */
  isComplete() {
    return this.getPctComplete() >= 1;
  }
  /**
   * @returns {Promise<void>}
   */
  onCompletion() {
    return new Promise((resolve) => {
      if (this.isComplete()) {
        return;
      }
      this.awaits.push(resolve);
    });
  }
  /**
   * @returns {number}
   */
  getPctComplete() {
    let now = getNow();
    if (this.paused) {
      now -= now - this.timestampPause;
    }
    let diff = now - this.timestampStart;
    if (diff > this.duration) {
      diff = this.duration;
    } else if (diff < 0) {
      diff = -1;
    }
    return Math.min(1, diff / this.duration);
  }
}

export class Gauge {
  /**
   * @param {number} max
   * @param {number} rate
   */
  constructor(max, rate) {
    this.max = max;
    this.current = 0;
    this.decayRate = rate;
  }

  /**
   * @param {number} x
   */
  fill(x) {
    this.current += x;
    if (this.current > this.max) {
      this.current = this.max;
    }
  }
  /***/
  empty() {
    this.current = 0;
  }
  /**
   * @returns {boolean}
   */
  isFull() {
    return this.current >= this.max;
  }
  /**
   * @returns {number}
   */
  getPct() {
    return this.current / this.max;
  }
  /***/
  update() {
    this.current -= this.decayRate * draw.fm;
    if (this.current < 0) {
      this.current = 0;
    }
  }
}

/**
 * @typedef {object} Circle
 * @property {number} x
 * @property {number} y
 * @property {number} r
 */

/**
 * @typedef {object} Rectangle
 * @property {number} x
 * @property {number} y
 * @property {number} w
 * @property {number} h
 */

/**
 * @param {number} x
 * @param {number} y
 * @param {number} w
 * @param {number} h
 * @returns {Rectangle}
 */
export const Rect = (x, y, w, h) => {
  return { x, y, w, h };
};

/**
 * @param {number} x
 * @param {number} y
 * @param {number} r
 * @returns {Circle}
 */
export const Circ = (x, y, r) => {
  return { x, y, r };
};

/**
 * @param {number} x1
 * @param {number} y1
 * @param {number} x2
 * @param {number} y2
 * @returns {number}
 */
export const distance = (x1, y1, x2, y2) => {
  const dx = x2 - x1;
  const dy = y2 - y1;
  return Math.sqrt(dx * dx + dy * dy);
};

export const circleCollides = (circle1, circle2) => {
  // eslint-disable-next-line
  let [x1, y1, r1] = circle1;
  // eslint-disable-next-line
  let [x2, y2, r2] = circle2;
  r1 = r1 || 1;
  r2 = r2 || 1;
  const d = distance(x1, y1, x2, y2);
  return d <= r1 + r2;
};

///**
// * @param {Circle} c
// * @param {Rectangle} r2
// * @returns {"none" | "bottom" | "left" | "right" | "top" | "top-left" | "top-right" | "bottom-left" | "bottom-right"}
// */
// export const circleRectCollides = (c, r2) => {
//   const r1 = Rect(c.x - c.r, c.y - c.r, c.r * 2, c.r * 2);
//   const dx = r1.x + r1.w / 2 - (r2.x + r2.w / 2);
//   const dy = r1.y + r1.h / 2 - (r2.y + r2.h / 2);
//   const width = (r1.w + r2.w) / 2;
//   const height = (r1.h + r2.h) / 2;
//   const crossWidth = width * dy;
//   const crossHeight = height * dx;

//   /**
//    * @type {"none" | "bottom" | "left" | "right" | "top" | "top-left" | "top-right" | "bottom-left" | "bottom-right" }
//    */
//   let collision = 'none';

//   if (Math.abs(dx) <= width && Math.abs(dy) <= height) {
//     if (crossWidth > crossHeight) {
//       collision = crossWidth > -crossHeight ? 'bottom' : 'left';
//     } else {
//       collision = crossWidth > -crossHeight ? 'right' : 'top';
//     }

//     if (c.x <= r2.x && c.y <= r2.y) {
//       collision = 'top-left';
//     } else if (c.x >= r2.x + r2.w && c.y <= r2.y) {
//       collision = 'top-right';
//     } else if (c.x <= r2.x && c.y >= r2.y + r2.h) {
//       collision = 'bottom-left';
//     } else if (c.x >= r2.x + r2.w && c.y >= r2.y + r2.h) {
//       collision = 'bottom-right';
//     }
//   }

//   return collision;
// };

export const getAngleTowards = (point1, point2) => {
  const [x1, y1] = point1;
  const [x2, y2] = point2;
  const lenY = y2 - y1;
  const hyp = distance(x1, y1, x2, y2);
  let ret = 0;
  if (y2 >= y1 && x2 >= x1) {
    ret = (Math.asin(lenY / hyp) * 180) / Math.PI + 90;
  } else if (y2 >= y1 && x2 < x1) {
    ret = (Math.asin(lenY / -hyp) * 180) / Math.PI - 90;
  } else if (y2 < y1 && x2 > x1) {
    ret = (Math.asin(lenY / hyp) * 180) / Math.PI + 90;
  } else {
    ret = (Math.asin(-lenY / hyp) * 180) / Math.PI - 90;
  }
  if (ret >= 360) {
    ret = 360 - ret;
  }
  if (ret < 0) {
    ret = 360 + ret;
  }
  return ret;
};
export const degreesToRadians = (degrees) => {
  return (degrees * Math.PI) / 180.0;
};
export const radiansToDegrees = (radians) => {
  return (radians * 180) / Math.PI;
};
/**
 * @param {number} angleDeg
 * @param {number} magnitude
 * @returns {number[]}
 */
export const getVector = (angleDeg, magnitude) => {
  magnitude = magnitude ?? 1;
  const angleRad = degreesToRadians(angleDeg);
  return [Math.sin(angleRad) * magnitude, -Math.cos(angleRad) * magnitude];
};
/**
 * Including n1 and n2, so range of 1-10 could include 1 or 10, negative works.
 *
 * @param {number} n1
 * @param {number} n2
 * @returns {number}
 */
export const randomInt = (n1, n2) => {
  return Math.floor(normalize(Math.random(), 0, 1, n1, n2 + 1));
};
// export const randomId = () => {
//   return Math.random().toString(36).substr(2, 9);
// };
/**
 * @param {number} x
 * @param {number} a
 * @param {number} b
 * @param {number} c
 * @param {number} d
 * @returns {number}
 */
export function normalize(x, a, b, c, d) {
  return c + ((x - a) * (d - c)) / (b - a);
}

/**
 * @param {any} selector
 * @param {(entity: object) => void} iterate
 * @returns {object}
 */
export function createSystem(selector, iterate) {
  return Object.assign(this, {
    update:
      typeof selector === 'function'
        ? selector
        : () => selector.iterate(iterate),
  });
}

/**
 * @param {import('./ecs.js').ECS} ecs
 * @returns {boolean}
 */
export function isGameStarted(ecs) {
  return getPlayerEntity(ecs).get(Player).gameStarted;
}

const sounds = {
  /* eslint-disable */
  start: [
    ,
    ,
    253,
    0.01,
    0.02,
    0.03,
    3,
    1.18,
    ,
    -76,
    -2,
    ,
    ,
    ,
    208,
    0.1,
    ,
    ,
    0.17,
    0.01,
  ],
  end: [
    ,
    ,
    0,
    0.25,
    0.12,
    0.23,
    3,
    0.46,
    30,
    ,
    -249,
    0.05,
    0.26,
    0.9,
    ,
    0.2,
    ,
    0.97,
    0.16,
    0.02,
  ],
  invalid: [
    1.04,
    0,
    254,
    0.01,
    0.03,
    0.13,
    1,
    0.17,
    ,
    0.1,
    ,
    ,
    ,
    0.8,
    -61,
    0.6,
    ,
    0.86,
    0.02,
  ],
  // invalid: [
  //   1.32,
  //   ,
  //   1592,
  //   0.15,
  //   0.04,
  //   0,
  //   ,
  //   0.9,
  //   ,
  //   ,
  //   -773,
  //   0.02,
  //   ,
  //   0.3,
  //   -84,
  //   ,
  //   0.02,
  //   0.8,
  //   ,
  //   0.01,
  // ],
  col: [, , 92, 0.02, 0.14, 0.01, 1, 0.31, 1.2, 1.5, , , 0.11, , , , , , 0.08],
  upgrade: [
    1.21,
    ,
    262,
    0.11,
    0.02,
    0,
    ,
    2.4,
    ,
    ,
    221,
    0.01,
    0.16,
    ,
    322,
    ,
    0.05,
    ,
    0.11,
  ],
  create: [
    ,
    ,
    104,
    ,
    0.06,
    0.23,
    3,
    0.32,
    ,
    -71,
    -309,
    0.01,
    ,
    ,
    20,
    ,
    ,
    0.69,
    0.17,
  ],
  heal: [
    1.1,
    ,
    261,
    0.18,
    0.03,
    0,
    ,
    1.63,
    -87,
    ,
    ,
    ,
    0.16,
    0.2,
    -204,
    ,
    0.01,
    ,
    0.07,
  ],
  sink: [
    1.73,
    ,
    187,
    0.11,
    0.02,
    0.13,
    2,
    1.09,
    -97,
    ,
    2,
    ,
    ,
    ,
    11,
    0.4,
    0.08,
    0.89,
    0.04,
  ],
  baseExpl: [
    2.72,
    ,
    749,
    0.01,
    0.29,
    0.41,
    2,
    1.83,
    ,
    0.7,
    ,
    ,
    0.14,
    0.2,
    ,
    0.7,
    0.17,
    0.45,
    0.02,
  ],
  shoot1: [
    0.5,
    ,
    424,
    0.02,
    0.01,
    0.17,
    4,
    0.16,
    -0.7,
    ,
    ,
    ,
    ,
    2,
    0.1,
    0.2,
    ,
    0.62,
    0.02,
    0.21,
  ],
  // exh: [2.02,,260,,.04,.01,,2.24,,13,-27,.02,.02,,-86,,.5,.92,.03,.55],
  exh: [0.2, 1, 100, , 0.02, 0, 4, 0, , 36, , , , , 8.4, -1, 0.13, , 0.15],
  exh2: [0.4, 1, 100, , 0.02, 0, 4, 0, , 36, , , , , 8.4, -1.4, 0.13, 0, 0.15],
  hit1: [
    1.11,
    ,
    325,
    0.02,
    0.1,
    0.14,
    3,
    1.3,
    ,
    -1.6,
    ,
    ,
    0.05,
    1.3,
    -39,
    0.1,
    ,
    0.88,
    0.01,
    0.24,
  ],
  hit2: [, , 245, 0.01, , 0.16, 4, 2.46, 2.5, , , , , 1.7, , , , 0.46, 0.02],
  crate: [, , 1727, 0.02, 0.01, 0.01, 3, 0.33, , , 108, 0.14, , , , 0.2],
  ghost: [
    2.18,
    ,
    1258,
    0.01,
    0.08,
    0.12,
    2,
    1.19,
    -0.3,
    -8.5,
    -437,
    0.01,
    0.09,
    ,
    ,
    ,
    0.09,
    0.57,
    0.01,
    0.17,
  ],
  /* eslint-enable */
};

let volume = 1;
export const playSound = (soundName) => {
  const arr = sounds[soundName];
  if (!arr) {
    throw new Error('no sound: ' + soundName);
  }
  // eslint-disable-next-line
  setVolume(volume * 0.2);
  zzfx(...arr);
};

// @ts-ignore
document.getElementById('volume').addEventListener('change', (ev) => {
  // @ts-ignore
  volume = Number(ev.target.value) / 100;
  playSound('coll');
});

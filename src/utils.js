import zzfx from './zzfx.js';

const getNow = () => window.performance.now();
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
 * @param {number} minX
 * @param {number} maxX
 * @param {number} minY
 * @param {number} maxY
 * @param {number} minDistBetween
 * @param {number[][]} usedCoords
 * @returns {number[]}
 */
export const generateCoords = (
  minX,
  maxX,
  minY,
  maxY,
  minDistBetween,
  usedCoords
) => {
  let nextX;
  let nextY;
  let ctr = 0;
  do {
    nextX = randomInt(minX, maxX);
    nextY = randomInt(minY, maxY);
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

export const playSound = (soundName) => {
  const sounds = {};
  const arr = sounds[soundName];
  console.log('play sound', soundName, arr);
  zzfx(...arr);
};

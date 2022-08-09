import zzfx from './zzfx.js';
// import { getSound } from './db.js';

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
  /** */
  static pauseAll() {
    timers.forEach((t) => t.pause());
  }
  /** */
  static unpauseAll() {
    timers.forEach((t) => t.unpause());
  }
  /** */
  static clearTimers() {
    timers.length = 0;
  }
  /**
   * @param {number} duration
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
export const getVector = (angleDeg, magnitude) => {
  magnitude = magnitude ?? 1;
  const angleRad = degreesToRadians(angleDeg);
  return [Math.sin(angleRad) * magnitude, -Math.cos(angleRad) * magnitude];
};
//including n1 and n2, so range of 1-10 could include 1 or 10, negative works
export const randomInt = (n1, n2) => {
  let offset = 0;
  if (n1 < 0) {
    offset = -n1;
  }
  n1 += offset;
  n2 += offset;
  const diff = Math.floor(Math.random() * (n2 - n1 + 1));
  return n1 + diff - offset;
};
export const playSound = (soundName) => {
  // const arr = getSound(soundName);
  // console.log('play sound', soundName, arr);
  // zzfx(...arr);
};

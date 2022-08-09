// @ts-check

import * as utils from './utils.js';
import draw from './draw.js';

export class PhysicsBody {
  x = 0;
  y = 0;
  vx = 0;
  vy = 0;
  width = 20;
  height = 20;
  mass = 0;
  heading = 0;
  angle = 0;
  rotateSpeed = 0;
  accelerationRate = 1;
  dragCoeff = 0.1;

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
    this.setAngle(utils.getAngleTowards([this.x, this.y], pos));
  }
  /**
   * @param {[number, number]} pos
   * @returns {boolean | undefined}
   */
  turnTowards(pos) {
    const h = utils.getAngleTowards([this.x, this.y], pos);
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
    const vr = this.rotateSpeed * frameRatio;
    if (d == 'l') {
      this.setAngle(this.angle - vr);
    } else if (d == 'r') {
      this.setAngle(this.angle + vr);
    }
  }
}

export class Sprite {
  spriteName = '';
  /**
   * @param {string} spriteName
   */
  constructor(spriteName) {
    this.spriteName = spriteName;
  }
}

export class Ship {
  type = '';
  shootTimer = new utils.Timer(1);
  /**
   * @param {'Player' | 'Ram' | 'Frigate'} type
   */
  constructor(type) {
    this.type = type;
    switch (type) {
      case 'Ram': {
        break;
      }
      case 'Frigate': {
        this.shootTimer.start(100);
        break;
      }
      case 'Player':
      default: {
        this.shootTimer.start(100);
      }
    }
  }
}

export class Player {}
export class AI {}

// @ts-check

/**
 * @typedef {object} DrawTextParams
 * @property {string} [font]
 * @property {string} [color]
 * @property {number} [size]
 * @property {string} [align]
 * @property {string} [strokeColor]
 */

/** @typedef {[HTMLCanvasElement, number, number, number, number]} Sprite */

/** @type {HTMLCanvasElement | null} */
let canvas;
const images = {};
const sprites = {};

/**
 * @param {string} spriteName
 * @returns {Sprite}
 */
const getSprite = (spriteName) => sprites[spriteName];

/**
 * @param {string} imageName
 * @param {string} imagePath
 * @returns {Promise<HTMLImageElement>}
 */
const loadImage = (imageName, imagePath) => {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      images[imageName] = img;
      resolve(img);
    };
    img.src = imagePath;
  });
};

export const colors = {
  WHITE: '#F8F8F8',
  BLACK: '#111',
  //   GREY: '#8D87A2',
  //   BLUE: '#42CAFD',
  //   RED: '#E1534A',
  //   YELLOW: '#FFCE00',
  //   GREEN: '#71AA34',
  //   PURPLE: '#8E478C',
};

/** @type {DrawTextParams} */
const DEFAULT_TEXT_PARAMS = {
  font: 'monospace',
  color: colors.WHITE,
  size: 14,
  align: 'center',
  strokeColor: colors.BLACK,
};

class Draw {
  width = 0;
  height = 0;
  fm = 1; // frame multiplier, updated every frame
  colors = colors;
  SCREEN_HEIGHT = 512 * 1.5;
  SCREEN_WIDTH = 683 * 1.5;

  enabled = true;

  /** */
  async init() {
    const [c] = this.createCanvas('canv', this.width, this.height);
    canvas = c;
    this.handleResize();
    document.getElementById('canvasDiv')?.appendChild(canvas);
    const img = await loadImage('sprites', 'res/sprites.png');
    const imgSize = img.width;
    const spriteSize = 16;
    let ctr = 0;
    for (let i = 0; i < imgSize / spriteSize; i++) {
      for (let j = 0; j < imgSize / spriteSize; j++) {
        const sprite = this.createSprite(
          img,
          j * spriteSize,
          i * spriteSize,
          spriteSize,
          spriteSize
        );
        sprites['spr_' + ctr] = sprite;
        const fSprite = (sprites['spr_' + ctr + '_f'] =
          this.createFlippedSprite(sprite));
        sprites['spr_' + ctr + '_h'] = this.createHitSprite(sprite);
        sprites['spr_' + ctr + '_f_h'] = this.createHitSprite(fSprite);
        ctr++;
      }
    }
  }
  /** */
  handleResize() {
    if (canvas) {
      canvas.width = this.width = this.SCREEN_WIDTH;
      canvas.height = this.height = this.SCREEN_HEIGHT;
      this.getCtx().imageSmoothingEnabled = false;
    }
  }

  /**
   * @returns {CanvasRenderingContext2D}
   */
  getCtx() {
    //@ts-ignore
    const ctx = canvas.getContext('2d');
    //@ts-ignore
    return ctx;
  }
  /**
   * @param {number} n
   */
  setOpacity(n) {
    this.getCtx().globalAlpha = n;
  }

  /**
   * @param {string} id
   * @param {number} w
   * @param {number} h
   * @returns {[HTMLCanvasElement, CanvasRenderingContext2D]}
   */
  createCanvas = (id, w, h) => {
    const canvas = document.createElement('canvas');
    canvas.id = id;
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    //@ts-ignore
    ctx.imageSmoothingEnabled = false;
    //@ts-ignore
    return [canvas, ctx];
  };

  /**
   * @param {HTMLImageElement | HTMLCanvasElement} img
   * @param {number} x
   * @param {number} y
   * @param {number} w
   * @param {number} h
   * @returns {Sprite}
   */
  createSprite(img, x, y, w, h) {
    const [canvas, ctx] = this.createCanvas('', 16, 16);
    ctx.drawImage(img, x, y, w, h, 0, 0, w, h);
    return [canvas, 0, 0, w, h];
  }

  /**
   * @param {Sprite} sprite
   * @returns {Sprite}
   */
  createFlippedSprite(sprite) {
    const [c, , , w, h] = sprite;
    const [canvas, ctx] = this.createCanvas('', w, h);
    ctx.translate(w, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(c, 0, 0);
    return [canvas, 0, 0, w, h];
  }

  /**
   * @param {Sprite} sprite
   * @returns {Sprite}
   */
  createHitSprite(sprite) {
    const [c, , , w, h] = sprite;
    const [canvas, ctx] = this.createCanvas('', w, h);
    ctx.filter = 'invert(1)';
    ctx.drawImage(c, 0, 0);
    return [canvas, 0, 0, w, h];
  }

  /**
   * @param {CanvasRenderingContext2D} [ctx]
   */
  clear(ctx) {
    ctx = ctx ?? this.getCtx();
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  }

  /**
   * @param {string} sprite
   * @param {number} x
   * @param {number} y
   * @param {number} [rotation]
   * @param {number} [scale]
   * @param {CanvasRenderingContext2D} [ctx]
   */
  drawSprite(sprite, x, y, rotation, scale, ctx) {
    if (!this.enabled) {
      return;
    }

    scale = scale || 1;
    ctx = ctx ?? this.getCtx();
    ctx.save();
    const spriteObj = getSprite(sprite);
    rotation = rotation || 0;
    const [image, sprX, sprY, sprW, sprH] = spriteObj;
    const w = sprW * scale;
    const h = sprH * scale;

    x -= w / 2;
    y -= w / 2;
    ctx.translate(x, y);
    ctx.translate(w / 2, h / 2);
    ctx.rotate((rotation * Math.PI) / 180);
    x = -w / 2;
    y = -h / 2;

    ctx.drawImage(
      image,
      sprX,
      sprY,
      sprW,
      sprH,
      x,
      y,
      sprW * scale,
      sprH * scale
    );
    ctx.restore();
  }

  /**
   * @param {number} x
   * @param {number} y
   * @param {number} w
   * @param {number} h
   * @param {string} color
   * @param {string} [stroke]
   * @param {CanvasRenderingContext2D} [ctx]
   */
  drawRect(x, y, w, h, color, stroke, ctx) {
    ctx = ctx ?? this.getCtx();
    if (stroke) {
      w -= ctx.lineWidth / 2;
      h -= ctx.lineWidth / 2;
    }

    ctx[stroke ? 'strokeStyle' : 'fillStyle'] = color;
    ctx[stroke ? 'strokeRect' : 'fillRect'](x, y, w, h);
  }

  /**
   * @param {number} x
   * @param {number} y
   * @param {number} r
   * @param {string} color
   * @param {number} [pct]
   * @param {CanvasRenderingContext2D} [ctx]
   */
  drawCircle(x, y, r, color, pct, ctx) {
    ctx = ctx ?? this.getCtx();
    ctx.beginPath();
    ctx.arc(x, y, r, 0 - Math.PI / 2, 2 * Math.PI * (pct ?? 1) - Math.PI / 2);
    ctx.fillStyle = color;
    ctx.fill();
  }

  /**
   * @param {number} x
   * @param {number} y
   * @param {number} x2
   * @param {number} y2
   * @param {string} color
   * @param {number} [width]
   * @param {CanvasRenderingContext2D} [ctx]
   */
  drawLine(x, y, x2, y2, color, width, ctx) {
    width = width ?? 1;
    ctx = ctx ?? this.getCtx();
    ctx.lineWidth = width;
    ctx.strokeStyle = color;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x2, y2);
    ctx.stroke();
  }

  /**
   * @param {string} text
   * @param {number} x
   * @param {number} y
   * @param {Partial<DrawTextParams>} [textParams]
   * @param {CanvasRenderingContext2D} [ctx]
   */
  drawText(text, x, y, textParams, ctx) {
    const { font, size, color, align, strokeColor } = {
      ...DEFAULT_TEXT_PARAMS,
      ...(textParams ?? {}),
    };
    ctx = ctx ?? this.getCtx();
    ctx.font = `${size}px ${font}`;
    // @ts-ignore
    ctx.textAlign = align;
    ctx.textBaseline = 'middle';
    if (strokeColor) {
      ctx.strokeStyle = strokeColor;
      ctx.lineWidth = 4;
      ctx.strokeText(text, x, y);
    }

    // @ts-ignore
    ctx.fillStyle = color;
    ctx.fillText(text, x, y);
  }
}

export default new Draw();

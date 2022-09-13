import { Boost, HitPoints, Player, Ui } from './components.js';
import { colors, draw } from './draw.js';
import { getBaseEntity, getPlayerEntity, getUiEntity } from './entities.js';
import { Timer } from './utils.js';

let lastScore = undefined;
export const setLastScore = (n) => {
  lastScore = n;
};

/** @param {import('./ecs.js').ECS} ecs */
export function RenderUi(ecs) {
  /**
   * @param {number} x
   * @param {number} y
   * @param {number} w
   * @param {number} pct
   * @param {string} text
   * @param {string} color
   */
  function renderHpBar(x, y, w, pct, text, color) {
    draw.drawRect(x, y, w, 20, '#000');
    draw.drawRect(x, y, w * pct, 20, color);
    draw.drawText(text, x + 4, y + 11, {
      align: 'left',
    });
  }

  const ctx = draw.getCtx();

  /** @type {any} */
  const suppliesGrd = ctx.createLinearGradient(0, 0, 0, 150);
  suppliesGrd.addColorStop(0, 'rgba(0,0,0,0.25)');
  suppliesGrd.addColorStop(0.8, 'rgba(0,0,0,0)');

  /** @type {any} */
  const playerHpGrd = ctx.createLinearGradient(
    0,
    draw.height - 100,
    0,
    draw.height
  );
  playerHpGrd.addColorStop(1, 'rgba(0,0,0,0.25)');
  playerHpGrd.addColorStop(0, 'rgba(0,0,0,0)');

  // /** @type {any} */
  // const heartHpGrd = ctx.createLinearGradient(
  //   0,
  //   draw.height - 100,
  //   0,
  //   draw.height
  // );
  // playerHpGrd.addColorStop(1, 'rgba(0,0,0,0.25)');
  // playerHpGrd.addColorStop(0, 'rgba(0,0,0,0)');

  /**
   * @param {Ui} ui
   */
  function renderGameUi(ui) {
    const playerEntity = getPlayerEntity(ecs);
    const player = playerEntity.get(Player);
    /** @type {Boost}*/
    const boost = playerEntity.get(Boost);

    const playerHp = playerEntity.get(HitPoints);
    const baseHp = getBaseEntity(ecs).get(HitPoints);

    const playerHpPct = playerHp.hp / playerHp.maxHp;
    const baseHpPct = baseHp.hp / baseHp.maxHp;
    const boostPct = 1 - boost.gauge.getPct();

    const hpWidth = 256;
    const bottom = draw.height - 40;
    const playerHpX = 20;
    const baseHpX = draw.width - hpWidth - 20;
    const upgradeY = 64;

    draw.drawRect(0, draw.height - 100, 300, 100, playerHpGrd);
    renderHpBar(
      playerHpX,
      bottom,
      hpWidth,
      playerHpPct,
      'Player HP',
      '#42CAFD'
    );
    renderHpBar(
      playerHpX,
      bottom - 32,
      hpWidth - 32,
      boostPct,
      'Boost',
      !boost.onCooldown ? '#827094' : '#243F72'
    );

    draw.drawRect(draw.width - 300, draw.height - 100, 300, 100, playerHpGrd);
    renderHpBar(baseHpX, bottom, hpWidth, baseHpPct, 'Heart HP', '#F47E1B');
    draw.drawText('Hearts Destroyed: ' + player.score, baseHpX, bottom - 16, {
      align: 'left',
    });

    const supplies = player.crates;

    draw.drawRect(0, 0, 260, 150, suppliesGrd);
    draw.drawSprite('spr_8_f', 64, 34, 0, 4);
    draw.drawText('Supplies: ' + supplies, 100, 32, {
      align: 'left',
    });

    const upgradeColors = [
      supplies >= ui.costUpgrade ? colors.LIGHTGREEN : colors.GREY,
      supplies >= ui.costNew ? colors.LIGHTGREEN : colors.GREY,
      supplies >= ui.costHeal ? colors.LIGHTGREEN : colors.GREY,
    ];
    if (ui.textFlashI > -1) {
      upgradeColors[ui.textFlashI] = ui.textFlashColor;
    }
    if (ui.textFlashTimer.isComplete()) {
      ui.textFlashI = -1;
    }

    draw.drawText(`Press 1: Upgrade Turret (${ui.costUpgrade})`, 20, upgradeY, {
      color: upgradeColors[0],
      align: 'left',
    });
    draw.drawText(`Press 2: New Turret (${ui.costNew})`, 20, upgradeY + 32, {
      color: upgradeColors[1],
      align: 'left',
    });
    draw.drawText(`Press 3: Repair (${ui.costHeal})`, 20, upgradeY + 32 * 2, {
      color: upgradeColors[2],
      align: 'left',
    });
  }

  const menuUiHeartTimer = new Timer(500);
  menuUiHeartTimer.start();
  let menuHeartSpr = 'spr_21';
  let menuPressButtonTextC = '#aaa';

  const renderFirstScreenUi = () => {
    // draw.drawText(
    //   '"I sing, O Muse, of a time when mortals did do not succumb to the will of unbenevolent gods."',
    //   draw.width / 2,
    //   draw.height - 200,
    //   {
    //     // align: 'left',
    //     size: 16,
    //     color: '#00A383',
    //   }
    // );
    draw.drawText('Your objective: ', draw.width / 2, 100, {
      // align: 'left',
      size: 24,
      color: '#aaa',
    });
    draw.drawText('Destroy the Hearts of the Gods', draw.width / 2, 100 + 32, {
      // align: 'left',
      size: 24,
      color: '#fff',
    });
    draw.drawSprite(menuHeartSpr, draw.width / 2, 220, 0, 6);

    draw.drawText(
      'The underworld navy will try to stop you.',
      draw.width / 2,
      320,
      {
        // align: 'left',
        size: 24,
        color: '#fff',
      }
    );

    // draw.drawSprite('spr_8', draw.width / 2, 400 + 32 + 64, 0, 6);
    draw.drawSprite('spr_3', draw.width / 2, 380, 0, 4);

    draw.drawText(
      'Pick up supplies to upgrade your vessel.',
      draw.width / 2,
      400 + 32 + 16,
      {
        // align: 'left',
        size: 24,
        color: '#fff',
      }
    );

    draw.drawSprite('spr_8', draw.width / 2, 400 + 32 + 64 + 16, 0, 6);

    // draw.drawText(
    //   'Navigate your vessel through dangerous waters.',
    //   draw.width / 2,
    //   400,
    //   {
    //     // align: 'left',
    //     size: 24,
    //     color: '#fff',
    //   }
    // );
    draw.drawText(
      'Left/Right Arrows: Turn Vessel   Up/Down Arrows: Accelerate Vessel',
      draw.width / 2,
      564,
      {
        // align: 'left',
        size: 24,
        color: '#aaa',
      }
    );
    draw.drawText('Shift: Boost', draw.width / 2, 600, {
      // align: 'left',
      size: 24,
      color: '#aaa',
    });

    draw.drawText('Press any button.', draw.width / 2, draw.height - 100, {
      // align: 'left',
      size: 32,
      color: menuPressButtonTextC,
    });
  };

  const renderMenuUi = () => {
    const playerEntity = getPlayerEntity(ecs);
    /** @type {Player}*/
    const player = playerEntity.get(Player);
    if (!player.gameStarted) {
      draw.drawRect(0, 0, draw.width, draw.height, '#000');

      if (menuUiHeartTimer.isComplete()) {
        menuHeartSpr = menuHeartSpr === 'spr_21' ? 'spr_21_f' : 'spr_21';
        menuPressButtonTextC =
          menuPressButtonTextC === '#aaa' ? '#fff' : '#aaa';
        menuUiHeartTimer.start();
      }

      if (player.firstScreenUiVisible) {
        renderFirstScreenUi();
        return;
      }

      draw.drawText('HEART OF THE GODS', draw.width / 2, 100 + 40, {
        // align: 'left',
        size: 52,
        color: '#00635C',
        strokeColor: '',
      });

      draw.drawText('HEART OF THE GODS', draw.width / 2, 100 + 40 + 4, {
        // align: 'left',
        size: 52,
        color: '#8E478C',
        strokeColor: '',
      });

      draw.drawText('HEART OF THE GODS', draw.width / 2, 100 + 40 + 8, {
        // align: 'left',
        size: 52,
        color: '#00635C',
        strokeColor: '',
      });

      draw.drawSprite(menuHeartSpr, draw.width / 2, draw.height / 2, 0, 6);

      if (lastScore !== undefined) {
        draw.drawText(
          'Hearts Destroyed on Previous Mission: ' + lastScore,
          draw.width / 2,
          draw.height - 300,
          {
            // align: 'left',
            size: 16,
            color: '#FFF',
          }
        );
      }

      draw.drawText(
        'Welcome to the Underworld.',
        draw.width / 2,
        draw.height - 200,
        {
          // align: 'left',
          size: 16,
          color: '#00A383',
        }
      );

      draw.drawText('Press any button.', draw.width / 2, draw.height - 100, {
        // align: 'left',
        size: 32,
        color: menuPressButtonTextC,
      });
    }
  };

  this.update = () => {
    /**
     * @type {Ui}
     */
    const ui = getUiEntity(ecs).get(Ui);

    if (!ui.textTimer.isComplete()) {
      draw.drawText(ui.text, draw.width / 2, 150, {
        // align: 'left',
        size: 32,
      });
    }

    if (!ui.endTimer.isComplete()) {
      draw.drawText('Game over.', draw.width / 2, draw.height / 2, {
        // align: 'left',
        size: 48,
      });
    }

    renderGameUi(ui);
    renderMenuUi();
  };
}

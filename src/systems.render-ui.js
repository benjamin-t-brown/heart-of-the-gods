import { HitPoints, Player, Ui } from './components.js';
import { colors, draw } from './draw.js';
import { getBaseEntity, getPlayerEntity, getUiEntity } from './entities.js';

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

  /**
   * @param {Ui} ui
   */
  function renderGameUi(ui) {
    const playerEntity = getPlayerEntity(ecs);
    const player = playerEntity.get(Player);

    const playerHp = playerEntity.get(HitPoints);
    const baseHp = getBaseEntity(ecs).get(HitPoints);

    const playerHpPct = playerHp.hp / playerHp.maxHp;
    const baseHpPct = baseHp.hp / baseHp.maxHp;

    const hpWidth = 256;
    const bottom = draw.height - 40;
    const playerHpX = 20;
    const baseHpX = draw.width - hpWidth - 20;
    const upgradeY = 25;

    renderHpBar(
      playerHpX,
      bottom,
      hpWidth,
      playerHpPct,
      'Player HP',
      '#42CAFD'
    );
    renderHpBar(baseHpX, bottom, hpWidth, baseHpPct, 'Heart HP', '#F47E1B');
    draw.drawText('Hearts Destroyed: ' + player.score, baseHpX, bottom - 16, {
      align: 'left',
    });

    const supplies = player.crates;
    draw.drawText('Supplies: ' + supplies, draw.width / 2, bottom);

    const upgradeColors = [
      supplies >= ui.costUpgrade ? colors.WHITE : colors.GREY,
      supplies >= ui.costNew ? colors.WHITE : colors.GREY,
      supplies >= ui.costHeal ? colors.WHITE : colors.GREY,
    ];
    if (ui.textFlashI > -1) {
      upgradeColors[ui.textFlashI] = ui.textFlashColor;
    }
    if (ui.textFlashTimer.isComplete()) {
      ui.textFlashI = -1;
    }

    draw.drawText(
      `Press 1: Upgrade Turret (${ui.costUpgrade})`,
      draw.width / 2 - 350,
      upgradeY,
      {
        color: upgradeColors[0],
      }
    );
    draw.drawText(
      `Press 2: New Turret (${ui.costNew})`,
      draw.width / 2,
      upgradeY,
      {
        color: upgradeColors[1],
      }
    );
    draw.drawText(
      `Press 3: Repair (${ui.costHeal})`,
      draw.width / 2 + 350,
      upgradeY,
      {
        color: upgradeColors[2],
      }
    );
  }

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

    const playerEntity = getPlayerEntity(ecs);
    const player = playerEntity.get(Player);
    if (!player.gameStarted) {
      draw.drawRect(0, 0, draw.width, draw.height, '#000');
      draw.drawText(
        'Press any button to start.',
        draw.width / 2,
        draw.height / 2,
        {
          // align: 'left',
          size: 48,
        }
      );
    }
  };
}

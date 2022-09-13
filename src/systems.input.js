import {
  Boost,
  Exhaust,
  HitPoints,
  PhysicsBody,
  Player,
  Ship,
  Ui,
} from './components.js';
import { colors } from './draw.js';
import { getBaseEntity, getUiEntity } from './entities.js';
import { createSystem, isGameStarted, playSound } from './utils.js';

/** @param {import('./ecs.js').ECS} ecs */
export function Input(ecs) {
  const selector = ecs.select(Player, PhysicsBody, HitPoints);

  /** @type {KeyboardEvent[]} */
  let keysDown = [];
  /** @type {KeyboardEvent[]} */
  let keysUp = [];

  window.addEventListener('keydown', (ev) => {
    keysDown.push(ev);
  });

  window.addEventListener('keyup', (ev) => {
    keysUp.push(ev);
  });

  let spawnNoiseCtr = 0;

  /**
   * @param {Player} player
   * @param {PhysicsBody} physics
   * @param {HitPoints} hp
   * @param {Exhaust} exhaust
   * @param {Boost} boost
   */
  const handleKeyUpdate = (player, physics, hp, exhaust, boost) => {
    if (hp.hp <= 0 || getBaseEntity(ecs).get(HitPoints).hp <= 0) {
      return;
    }

    let accelerating = false;
    let acceleratingReverse = false;
    const keys = player.keys;

    if (keys.ArrowLeft || keys.a) {
      physics.turn('l');
    }
    if (keys.ArrowRight || keys.d) {
      physics.turn('r');
    }
    if (keys.ArrowUp || keys.w) {
      accelerating = true;
    }
    if (keys.Shift) {
      boost.enabled = true;
      accelerating = true;
    } else {
      boost.enabled = false;
    }
    if (!accelerating && (keys.ArrowDown || keys.s)) {
      acceleratingReverse = true;
    }
    physics.acc = accelerating;
    physics.accRev = acceleratingReverse;

    if (
      (accelerating || acceleratingReverse) &&
      exhaust.spawnTimer.isComplete()
    ) {
      if (spawnNoiseCtr % 2) {
        playSound(boost.enabled && !boost.onCooldown ? 'exh2' : 'exh');
      }
      spawnNoiseCtr++;
    }
  };

  /**
   * @param {string} key
   * @param {Player} player
   * @param {Ship} ship
   * @param {HitPoints} hp
   */
  function onKeyDown(key, player, ship, hp) {
    /** @type {Ui} */
    const ui = getUiEntity(ecs).get(Ui);
    const supplies = player.crates;

    const assertCost = (cost) => {
      if (supplies < cost) {
        ui.setText(`Not enough supplies (need ${cost}).`);
        return false;
      } else {
        player.crates -= cost;
        return true;
      }
    };

    if (key === '1') {
      // upgrade turret
      if (assertCost(ui.costUpgrade)) {
        if (ship.upgradeTurret()) {
          ui.costUpgrade++;
          playSound('upgrade');
          ui.setText('Turret upgraded!');
          ui.setTextFlash(0, colors.GREEN);
        } else {
          player.crates += ui.costUpgrade;
          ui.setText('No more upgrades available!');
          playSound('invalid');
          ui.setTextFlash(0, colors.RED);
        }
      } else {
        playSound('invalid');
        ui.setTextFlash(0, colors.RED);
      }
    } else if (key === '2') {
      // add new turret
      if (assertCost(ui.costNew)) {
        ship.addTurret();
        ui.costNew += 2;
        playSound('create');
        ui.setText('Turret added!');
        ui.setTextFlash(0, colors.GREEN);
      } else {
        playSound('invalid');
        ui.setTextFlash(1, colors.RED);
      }
    } else if (key === '3') {
      // heal ship
      if (assertCost(ui.costHeal)) {
        playSound('heal');
        ui.costHeal += 5;
        ui.setText('Ship repaired!');
        hp.hp += 10;
        if (hp.hp > hp.maxHp) {
          hp.hp = hp.maxHp;
        }
        ui.setTextFlash(0, colors.GREEN);
      } else {
        playSound('invalid');
        ui.setTextFlash(2, colors.RED);
      }
    }
  }

  /** @param {import('./systems.js').Entity} entity */
  const iterate = (entity) => {
    /** @type {Player} */
    const player = entity.get(Player);
    /** @type {PhysicsBody} */
    const physics = entity.get(PhysicsBody);
    /** @type {HitPoints} */
    const hp = entity.get(HitPoints);

    keysDown.forEach((ev) => {
      if (!player.gameStarted) {
        if (!player.firstScreenUiVisible) {
          playSound('hit1');
          player.firstScreenUiVisible = true;
        } else {
          player.firstScreenUiVisible = false;
          player.gameStarted = true;
          const ui = getUiEntity(ecs).get(Ui);
          ui.setText('Destroy the Hearts of the Gods!');
          playSound('start');
        }
      } else if (!player.gameOver) {
        onKeyDown(ev.key, player, entity.get(Ship), hp);
      }
      player.setKeyDown(ev.key);
    });
    keysUp.forEach((ev) => {
      player.setKeyUp(ev.key);
    });

    if (isGameStarted(ecs)) {
      handleKeyUpdate(
        player,
        physics,
        hp,
        entity.get(Exhaust),
        entity.get(Boost)
      );
    }

    if (keysUp.length) {
      keysUp = [];
    }
    if (keysDown.length) {
      keysDown = [];
    }
  };

  createSystem.bind(this)(selector, iterate);
}

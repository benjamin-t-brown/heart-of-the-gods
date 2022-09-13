import {
  Player,
  PhysicsBody,
  Ship,
  HitPoints,
  Turret,
  Ghost,
} from './components.js';
import {
  createProjectile,
  getBaseEntity,
  getPlayerEntity,
  isPlayerEntity,
} from './entities.js';
import { distance, getVector, isGameStarted, playSound } from './utils.js';

// const PLAYER_PROJECTILE_COLOR = '#42CAFD';
// const ENEMY_PROJECTILE_COLOR = '#F47E1B';

/** @param {import('./ecs.js').ECS} ecs */
export function TurretAI(ecs) {
  const ships = ecs.select(Ship, PhysicsBody, HitPoints);
  const ghosts = ecs.select(Ghost, PhysicsBody, HitPoints);
  const turrets = ecs.select(Turret, PhysicsBody, HitPoints);

  /**
   * @param {number} xTurret
   * @param {number} yTurret
   * @param {import('./systems.js').Entity} owningEntity
   * @returns {number[] | null}
   */
  const getClosestTarget = (xTurret, yTurret, owningEntity) => {
    let closestDist = Infinity;
    /** @type {number[]}*/
    let ret = [];

    let targets = [];

    ships.iterate((entity) => {
      /** @type {Ship} */
      const ship = entity.get(Ship);
      /** @type {PhysicsBody} */
      const { angle, x, y } = entity.get(PhysicsBody);

      if (entity.id === owningEntity.id) {
        return;
      }

      for (const { offset } of ship.hitCircles) {
        const [eX, eY] = getVector(angle, offset);
        const circleX = x + eX;
        const circleY = y + eY;
        const d = distance(circleX, circleY, xTurret, yTurret);
        targets.push([circleX, circleY, d]);
      }
    });

    turrets.iterate((entity) => {
      /** @type {PhysicsBody} */
      const { x, y } = entity.get(PhysicsBody);
      const d = distance(x, y, xTurret, yTurret);
      targets.push([x, y, d]);
    });

    ghosts.iterate((entity) => {
      /** @type {PhysicsBody} */
      const { x, y } = entity.get(PhysicsBody);
      const d = distance(x, y, xTurret, yTurret);
      targets.push([x, y, d]);
    });

    const base = getBaseEntity(ecs);
    const basePhysics = base.get(PhysicsBody);
    const { x, y } = basePhysics;
    const d = distance(x, y, xTurret, yTurret);
    targets.push([x, y, d]);

    for (let i = 0; i < targets.length; i++) {
      const target = targets[i];
      if (target[2] < closestDist) {
        ret = target;
        closestDist = target[2];
      }
    }

    return ret.length ? ret : null;
  };

  /**
   * @param {number} turretX
   * @param {number} turretY
   * @returns {number[]}
   */
  const acquirePlayerTarget = (turretX, turretY) => {
    const playerShipPhysics = getPlayerEntity(ecs).get(PhysicsBody);
    const distToPlayer = distance(
      turretX,
      turretY,
      playerShipPhysics.x,
      playerShipPhysics.y
    );
    return [playerShipPhysics.x, playerShipPhysics.y, distToPlayer];
  };

  /**
   * @param {Turret} turret
   * @param {string} type
   * @param {number[]} target
   * @returns {boolean | undefined}
   */
  const updateTurret = (turret, type, target) => {
    const [targetX, targetY, d] = target;
    const { physics, range, timer, sprTimer, dmg } = turret;

    if (d < range) {
      physics.lookAt([targetX, targetY]);
      if (timer.isComplete()) {
        timer.start();
        sprTimer.start();
        const vec = getVector(physics.angle, 16);
        playSound('shoot1');
        createProjectile(ecs, type, {
          col: turret.prjColor,
          x: physics.x + vec[0],
          y: physics.y + vec[1],
          angle: physics.angle,
          spd: turret.prjSpd + Math.sqrt(physics.vx ** 2 + physics.vy ** 2),
          dmg,
          ms: 4000,
          sz: turret.prjSz,
        });
      }
      return true;
    }
  };

  /** @param {import('./systems.js').Entity} entity */
  const updateShipTurrets = (entity) => {
    /** @type {Ship} */
    const ship = entity.get(Ship);
    /** @type {PhysicsBody} */
    const { angle, x, y } = entity.get(PhysicsBody);
    /** @type {HitPoints} */
    const hp = entity.get(HitPoints);

    const turretList = ship.getTurretPositions(angle);
    for (const turret of turretList) {
      const {
        offset: [eX, eY],
        physics,
      } = turret;

      const turretX = (physics.x = x + eX);
      const turretY = (physics.y = y + eY);

      /** @type {number[] | null}*/
      let target;
      let type = 'player';
      if (isPlayerEntity(entity)) {
        target = getClosestTarget(turretX, turretY, entity);
      } else {
        type = 'enemy';
        target = acquirePlayerTarget(turretX, turretY);
      }
      if (!target || hp.hp <= 0) {
        continue;
      }

      const player = getPlayerEntity(ecs).get(Player);
      if (!isGameStarted(ecs) || player.gameOver) {
        continue;
      }

      if (updateTurret(turret, type, target)) {
        continue;
      }
    }
  };

  // /** @param {Entity} entity */
  // const updateStandaloneTurrets = (entity) => {
  //   /** @type {Turret} */
  //   const turret = entity.get(Turret);
  //   const target = acquirePlayerTarget(turret.physics.x, turret.physics.y);
  //   updateTurret(turret, 'enemy', target);
  // };

  this.update = () => {
    ships.iterate(updateShipTurrets);
    // turrets.iterate(updateStandaloneTurrets);
  };
}

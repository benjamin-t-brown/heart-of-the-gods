import {
  Player,
  PhysicsBody,
  Ship,
  HitRectangle,
  HitCircle,
  Projectile,
  HitHighlightRender,
  HitPoints,
  Crate,
} from './components.js';
import { getPlayerEntity, isPlayerEntity } from './entities.js';
import { circleCollides, getAngleTowards, getVector, playSound } from './utils.js';

/** @param {import('./ecs.js').ECS} ecs */
export function Collisions(ecs) {
  const ships = ecs.select(Ship, PhysicsBody, HitHighlightRender, HitPoints);
  const islands = ecs.select(HitRectangle, PhysicsBody);
  const projectiles = ecs.select(HitCircle, PhysicsBody, Projectile);
  const bases = ecs.select(
    HitCircle,
    PhysicsBody,
    HitHighlightRender,
    HitPoints
  );
  const crates = ecs.select(HitCircle, PhysicsBody, Crate);

  // /**
  //  * @param {PhysicsBody} physics
  //  * @param {HitCircle} hitCircle
  //  * @returns {number[]}
  //  */
  // function getCollisionCircle(physics, hitCircle) {}

  /**
   * @param {import('./systems.js').Entity} entity2
   */
  function checkShipPlayerCollisions(entity2) {
    // if (entity1 === entity2 || isPlayerEntity(entity2)) {
    //   return;
    // }

    const entity1 = getPlayerEntity(ecs);

    if (entity1 === entity2) {
      return;
    }

    /** @type {Ship} */
    const ship1 = entity1.get(Ship);
    /** @type {PhysicsBody} */
    const ship1Physics = entity1.get(PhysicsBody);
    /** @type {PhysicsBody} */
    const ship2Physics = entity2.get(PhysicsBody);

    for (const { r, offset } of ship1.hitCircles) {
      const [eX, eY] = getVector(ship1Physics.angle, offset);
      const { x, y } = ship1Physics;

      const [eX2, eY2] = getVector(ship2Physics.angle, 0);
      const { x: x2, y: y2 } = ship2Physics;

      if (circleCollides([x + eX, y + eY, r], [x2 + eX2, y2 + eY2, 10])) {
        entity2.get(HitPoints).hp = 0;
        playSound('col');
        return;
      }
      // DEBUG
      // draw.getCtx().save();
      // draw.getCtx().translate(-camera.x, -camera.y);
      // draw.drawCircle(x + eX, y + eY, hitCircle.r, 'rgba(255, 0, 0, 0.25)');
      // draw.getCtx().restore();
    }
  }

  /**
   * @param {import('./systems.js').Entity} shipEntity
   * @param {import('./systems.js').Entity} projectileEntity
   */
  function checkShipProjectileCollisions(shipEntity, projectileEntity) {
    /** @type {Ship} */
    const ship1 = shipEntity.get(Ship);
    /** @type {PhysicsBody} */
    const shipPhysics = shipEntity.get(PhysicsBody);
    /** @type {HitHighlightRender} */
    const shipHitHighlightRender = shipEntity.get(HitHighlightRender);

    /** @type {HitCircle} */
    const circ = projectileEntity.get(HitCircle);
    /** @type {Projectile} */
    const proj = projectileEntity.get(Projectile);
    /** @type {PhysicsBody} */
    const projPhysics = projectileEntity.get(PhysicsBody);

    if (
      (isPlayerEntity(shipEntity) && proj.allegiance === 'player') ||
      (!isPlayerEntity(shipEntity) && proj.allegiance === 'enemy')
    ) {
      return;
    }

    for (const { r, offset } of ship1.hitCircles) {
      const [eX, eY] = getVector(shipPhysics.angle, offset);
      const { x, y } = shipPhysics;

      // console.log(
      //   'CHECK COLL',
      //   [x + eX, y + eY, r],
      //   [circ.circle.x, circ.circle.y, circ.circle.r]
      // );

      if (
        circleCollides(
          [x + eX, y + eY, r],
          [projPhysics.x, projPhysics.y, circ.circle.r]
        )
      ) {
        projectileEntity.eject();
        shipHitHighlightRender.sprTimer.start();
        shipEntity.get(HitPoints).hp -= proj.dmg;
        playSound('hit1');
        return;
      }
    }
  }

  /**
   * @param {import('./systems.js').Entity} shipEntity
   * @param {import('./systems.js').Entity} islandEntity
   */
  function checkShipIslandCollisions(shipEntity, islandEntity) {
    /** @type {Ship} */
    const ship1 = shipEntity.get(Ship);
    /** @type {PhysicsBody} */
    const shipPhysics = shipEntity.get(PhysicsBody);

    /** @type {HitRectangle} */
    const rect = islandEntity.get(HitRectangle);

    for (const { r, offset } of ship1.hitCircles) {
      const [eX, eY] = getVector(shipPhysics.angle, offset);

      const { x, y, w, h } = rect.rect;

      const shipX = shipPhysics.x + eX;
      const shipY = shipPhysics.y + eY;

      const rectX = x + w / 2;
      const rectY = y + h / 2;

      if (circleCollides([shipX, shipY, r], [rectX, rectY, (w + 16) / 2])) {
        const angleTowards = getAngleTowards([rectX, rectY], [shipX, shipY]);
        const [pushX, pushY] = getVector(angleTowards, 1);
        shipPhysics.x += pushX * 3;
        shipPhysics.y += pushY * 3;
      }
    }
  }

  /**
   * @param {import('./systems.js').Entity} baseEntity
   * @param {import('./systems.js').Entity} projectileEntity
   */
  function checkBaseProjectileCollisions(baseEntity, projectileEntity) {
    /** @type {PhysicsBody} */
    const basePhysics = baseEntity.get(PhysicsBody);
    /** @type {HitHighlightRender} */
    const baseHitHighlightRender = baseEntity.get(HitHighlightRender);
    /** @type {HitCircle} */
    const baseCirc = projectileEntity.get(HitCircle);

    /** @type {HitCircle} */
    const circ = projectileEntity.get(HitCircle);
    /** @type {Projectile} */
    const proj = projectileEntity.get(Projectile);
    /** @type {PhysicsBody} */
    const projPhysics = projectileEntity.get(PhysicsBody);

    if (proj.allegiance === 'enemy') {
      return;
    }

    const { x, y } = basePhysics;

    if (
      circleCollides(
        [x, y, baseCirc.circle.r],
        [projPhysics.x, projPhysics.y, circ.circle.r]
      )
    ) {
      projectileEntity.eject();
      baseHitHighlightRender.sprTimer.start();
      baseEntity.get(HitPoints).hp -= proj.dmg;
      playSound('hit2');
      return;
    }
  }

  /**
   * @param {import('./systems.js').Entity} crateEntity
   */
  function checkCratePlayerCollisions(crateEntity) {
    const playerEntity = getPlayerEntity(ecs);

    /** @type {Ship} */
    const ship1 = playerEntity.get(Ship);
    /** @type {Player} */
    const player = playerEntity.get(Player);
    /** @type {PhysicsBody} */
    const shipPhysics = playerEntity.get(PhysicsBody);

    /** @type {HitCircle} */
    const circ = crateEntity.get(HitCircle);
    /** @type {PhysicsBody} */
    const cratePhysics = crateEntity.get(PhysicsBody);

    for (const { r, offset } of ship1.hitCircles) {
      const [eX, eY] = getVector(shipPhysics.angle, offset);
      const { x, y } = shipPhysics;

      if (
        circleCollides(
          [x + eX, y + eY, r],
          [cratePhysics.x, cratePhysics.y, circ.circle.r]
        )
      ) {
        crateEntity.eject();
        player.crates++;
        playSound('crate');
        return;
      }
    }
  }

  /**
   * @param {import('./systems.js').Entity} shipEntity1
   */
  const checkCollisionsWithShip = (shipEntity1) => {
    // setCamera();
    islands.iterate(checkShipIslandCollisions.bind(this, shipEntity1));
    projectiles.iterate(checkShipProjectileCollisions.bind(this, shipEntity1));
  };

  /**
   * @param {import('./systems.js').Entity} baseEntity
   */
  const checkCollisionsWithBase = (baseEntity) => {
    projectiles.iterate(checkBaseProjectileCollisions.bind(this, baseEntity));
  };

  this.update = () => {
    ships.iterate(checkCollisionsWithShip);
    ships.iterate(checkShipPlayerCollisions);
    bases.iterate(checkCollisionsWithBase);
    crates.iterate(checkCratePlayerCollisions);
  };
}

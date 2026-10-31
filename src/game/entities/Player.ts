import { Container, Graphics, Sprite } from 'pixi.js'
import { PLAYER } from '../config'
import { moveAndCollide, type Body, type SolidGrid } from '../systems/collision'
import type { Vec2 } from '../types'
import type { GameTextures } from '../world/textures'

type Facing = 'up' | 'down' | 'left' | 'right'

/**
 * Гравець. (x, y) — позиція "ніг": саме по ній сортується глибина і рахуються колізії.
 * Візуал: тінь (нерухома) + тіло (підстрибує при ході, не змінюючи позицію ніг).
 */
export class Player implements Body {
  x: number
  y: number
  readonly halfWidth = PLAYER.halfWidth
  readonly height = PLAYER.footHeight

  readonly view = new Container()
  private readonly body = new Container()
  private readonly face = new Graphics()
  private facing: Facing = 'down'
  private walkTime = 0
  private moving = false

  constructor(spawn: Vec2, textures: GameTextures) {
    this.x = spawn.x
    this.y = spawn.y

    const shadow = new Sprite(textures.shadow)
    shadow.anchor.set(0.5, 0.5)
    shadow.position.set(0, -1)

    // Проста полуничка з коду; замінимо на AnimatedSprite, коли з'явиться арт.
    const berry = new Graphics()
      .ellipse(0, -11, 9, 10)
      .fill(0xd7263d)
      .ellipse(-3, -14, 3, 2)
      .fill({ color: 0xffffff, alpha: 0.25 })
      .poly([-7, -19, -3, -24, 0, -20, 3, -24, 7, -19, 0, -17])
      .fill(0x3fae4a)

    this.body.addChild(berry, this.face)
    this.view.addChild(shadow, this.body)
    this.drawFace()
    this.syncView()
  }

  update(dt: number, move: Vec2, grid: SolidGrid) {
    this.moving = move.x !== 0 || move.y !== 0

    if (this.moving) {
      moveAndCollide(this, move.x * PLAYER.speed * dt, move.y * PLAYER.speed * dt, grid)
      this.walkTime += dt
      const facing = Math.abs(move.x) > Math.abs(move.y) ? (move.x > 0 ? 'right' : 'left') : move.y > 0 ? 'down' : 'up'
      if (facing !== this.facing) {
        this.facing = facing
        this.drawFace()
      }
    } else {
      this.walkTime = 0
    }
  }

  /** Синхронізація візуалу зі станом; викликається щокадру. */
  syncView() {
    this.view.position.set(Math.round(this.x), Math.round(this.y))
    // Глибина: чим нижче ноги на екрані, тим "ближче" до камери.
    this.view.zIndex = this.y

    const bob = this.moving ? Math.abs(Math.sin(this.walkTime * 12)) * 3 : 0
    this.body.y = -bob
  }

  /** Очі показують напрямок погляду. */
  private drawFace() {
    const g = this.face.clear()
    const dx = this.facing === 'left' ? -3 : this.facing === 'right' ? 3 : 0
    if (this.facing === 'up') return // спиною: без очей
    const dy = this.facing === 'down' ? 0 : -1
    g.circle(-3 + dx, -12 + dy, 1.4).fill(0x1b1b1b)
    g.circle(3 + dx, -12 + dy, 1.4).fill(0x1b1b1b)
  }
}

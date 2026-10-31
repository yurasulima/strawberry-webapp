import { Container, Sprite } from 'pixi.js'
import type { Vec2 } from '../types'
import type { GameTextures } from '../world/textures'

export const PICKUP_RADIUS = 9

/** Предмет, що збирається дотиком. Погойдується, щоб привертати увагу. */
export class Pickup {
  readonly view = new Container()
  collected = false
  readonly x: number
  readonly y: number
  private readonly sprite: Sprite
  private readonly phase = Math.random() * Math.PI * 2
  private time = 0

  constructor(pos: Vec2, textures: GameTextures) {
    this.x = pos.x
    this.y = pos.y

    const shadow = new Sprite(textures.shadow)
    shadow.anchor.set(0.5, 0.5)
    shadow.scale.set(0.6)
    shadow.position.set(0, 6)

    this.sprite = new Sprite(textures.berry)
    this.sprite.anchor.set(0.5, 0.5)

    this.view.addChild(shadow, this.sprite)
    this.view.position.set(pos.x, pos.y)
    // Сортуємо за "підлогою" під предметом, щоб гравець міг бути і позаду, і попереду.
    this.view.zIndex = pos.y + 6
  }

  update(dt: number) {
    this.time += dt
    this.sprite.y = Math.round(Math.sin(this.time * 3 + this.phase) * 2)
  }

  collect() {
    this.collected = true
    this.view.destroy({ children: true })
  }
}

import type { Application } from 'pixi.js'
import { Container } from 'pixi.js'
import { Pickup, PICKUP_RADIUS } from '../entities/Pickup'
import { Player } from '../entities/Player'
import { Camera } from '../systems/Camera'
import { overlapsCircle } from '../systems/collision'
import type { Input } from '../systems/Input'
import type { GameEvents, Scene } from '../types'
import { LEVEL_1 } from '../world/levels'
import { TileMap } from '../world/TileMap'
import { createTextures, type GameTextures } from '../world/textures'

/**
 * Один рівень: карта + гравець + предмети + камера.
 * Ієрархія: root -> world (камера рухає її) -> [ground, objects(y-sort)].
 */
export class LevelScene implements Scene {
  readonly root = new Container()
  private readonly world = new Container()
  private readonly camera = new Camera(this.world)
  private readonly textures: GameTextures
  private readonly map: TileMap
  private readonly player: Player
  private pickups: Pickup[] = []
  private coins = 0

  constructor(
    app: Application,
    private readonly input: Input,
    private readonly events: GameEvents,
  ) {
    this.textures = createTextures(app.renderer)
    this.map = new TileMap(LEVEL_1, this.textures)
    this.player = new Player(this.map.spawn, this.textures)

    this.pickups = this.map.pickups.map((p) => new Pickup(p, this.textures))
    for (const pickup of this.pickups) this.map.objects.addChild(pickup.view)
    this.map.objects.addChild(this.player.view)

    this.world.addChild(this.map.ground, this.map.objects)
    this.root.addChild(this.world)

    this.camera.setWorldSize(this.map.pixelWidth, this.map.pixelHeight)
    this.resize(app.screen.width, app.screen.height)
    this.camera.snapTo(this.player)
    this.events.onCoins?.(this.coins)
  }

  update(dt: number) {
    this.player.update(dt, this.input.getMove(), this.map)

    for (const pickup of this.pickups) {
      if (pickup.collected) continue
      if (overlapsCircle(this.player, pickup.x, pickup.y, PICKUP_RADIUS)) {
        pickup.collect()
        this.coins += 1
        this.events.onCoins?.(this.coins)
      }
    }
    this.pickups = this.pickups.filter((p) => !p.collected)
  }

  render(dt: number) {
    this.player.syncView()
    for (const pickup of this.pickups) pickup.update(dt)
    // Камера центрується на середині тіла, а не на ногах.
    this.camera.follow({ x: this.player.x, y: this.player.y - 8 }, dt)
  }

  resize(width: number, height: number) {
    this.camera.resize(width, height)
  }

  destroy() {
    this.root.destroy({ children: true })
    for (const texture of Object.values(this.textures)) texture.destroy(true)
  }
}

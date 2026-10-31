import { Container, Sprite } from 'pixi.js'
import { TILE } from '../config'
import type { SolidGrid } from '../systems/collision'
import type { Vec2 } from '../types'
import type { GameTextures } from './textures'

export type PickupSpawn = Vec2

/**
 * Будує світ із текстової карти на двох шарах:
 *  - ground  — плоска підлога, без сортування (дешево);
 *  - objects — усе, що має "висоту" (стіни, дерева, гравець, предмети) і сортується за Y.
 */
export class TileMap implements SolidGrid {
  readonly width: number
  readonly height: number
  readonly pixelWidth: number
  readonly pixelHeight: number
  readonly ground = new Container()
  readonly objects = new Container()
  readonly spawn: Vec2 = { x: TILE * 2, y: TILE * 2 }
  readonly pickups: PickupSpawn[] = []

  private readonly solid: boolean[]

  constructor(rows: string[], textures: GameTextures) {
    this.height = rows.length
    this.width = Math.max(...rows.map((r) => r.length))
    this.pixelWidth = this.width * TILE
    this.pixelHeight = this.height * TILE
    this.solid = new Array(this.width * this.height).fill(false)

    // Усі об'єкти сортуються за zIndex = y їхньої основи.
    this.objects.sortableChildren = true
    this.ground.eventMode = 'none'
    this.objects.eventMode = 'none'

    for (let ty = 0; ty < this.height; ty++) {
      for (let tx = 0; tx < this.width; tx++) {
        this.buildTile(rows[ty]?.[tx] ?? '#', tx, ty, textures)
      }
    }
  }

  isSolid(tx: number, ty: number): boolean {
    // Поза картою — суцільно, гравець не виходить за межі.
    if (tx < 0 || ty < 0 || tx >= this.width || ty >= this.height) return true
    return this.solid[ty * this.width + tx]!
  }

  private buildTile(ch: string, tx: number, ty: number, t: GameTextures) {
    const px = tx * TILE
    const py = ty * TILE
    const baseBottom = py + TILE

    switch (ch) {
      case '#': {
        this.solid[ty * this.width + tx] = true
        this.placeObject(t.wall, px, baseBottom)
        return
      }
      case 'T': {
        this.solid[ty * this.width + tx] = true
        this.addGround(t.grass, px, py)
        this.placeObject(t.tree, px, baseBottom)
        return
      }
      case '=':
        this.addGround(t.path, px, py)
        return
      case ',':
        this.addGround(t.grassAlt, px, py)
        return
      case 'S':
        this.addGround(t.grass, px, py)
        this.spawn.x = px + TILE / 2
        this.spawn.y = py + TILE - 4
        return
      case 'o':
        this.addGround(t.grass, px, py)
        this.pickups.push({ x: px + TILE / 2, y: py + TILE / 2 })
        return
      default:
        this.addGround(t.grass, px, py)
    }
  }

  private addGround(texture: GameTextures['grass'], x: number, y: number) {
    const s = new Sprite(texture)
    s.position.set(x, y)
    this.ground.addChild(s)
  }

  /** Спрайт з якорем "низ-ліво"; zIndex = нижня межа основи, тому сортування йде за Y. */
  private placeObject(texture: GameTextures['wall'], x: number, bottomY: number) {
    const s = new Sprite(texture)
    s.anchor.set(0, 1)
    s.position.set(x, bottomY)
    s.zIndex = bottomY
    this.objects.addChild(s)
  }
}

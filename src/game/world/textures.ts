import { Graphics, Rectangle, type Renderer, type Texture } from 'pixi.js'
import { TILE, TREE_HEIGHT, WALL_HEIGHT } from '../config'

export interface GameTextures {
  grass: Texture
  grassAlt: Texture
  path: Texture
  wall: Texture
  tree: Texture
  berry: Texture
  shadow: Texture
}

/**
 * Тимчасові текстури, намальовані кодом, щоб фундамент працював без ассетів.
 * Пізніше замініть на спрайтшити з public/game/ (Assets.load) і збережіть ті самі ключі.
 */
export function createTextures(renderer: Renderer): GameTextures {
  // Фіксований кадр (w x h) від (0,0): розмір текстури не залежить від контуру малюнка.
  const make = (g: Graphics, w: number, h: number): Texture => {
    const texture = renderer.generateTexture({ target: g, frame: new Rectangle(0, 0, w, h) })
    texture.source.scaleMode = 'nearest'
    g.destroy()
    return texture
  }

  // --- Підлога ---
  const grass = make(
    new Graphics()
      .rect(0, 0, TILE, TILE)
      .fill(0x3f8f4a)
      .rect(6, 8, 2, 2)
      .fill(0x56a85e)
      .rect(20, 22, 2, 2)
      .fill(0x2f7a3b),
    TILE,
    TILE,
  )

  const grassAlt = make(
    new Graphics()
      .rect(0, 0, TILE, TILE)
      .fill(0x3a8645)
      .rect(14, 6, 2, 2)
      .fill(0x56a85e)
      .rect(4, 24, 2, 2)
      .fill(0x2f7a3b)
      .rect(24, 14, 2, 2)
      .fill(0x56a85e),
    TILE,
    TILE,
  )

  const path = make(
    new Graphics()
      .rect(0, 0, TILE, TILE)
      .fill(0xb8975f)
      .rect(8, 10, 3, 2)
      .fill(0xa3834e)
      .rect(22, 20, 3, 2)
      .fill(0xcfae75),
    TILE,
    TILE,
  )

  // --- Стіна: верхня грань (TILE) + передня грань (WALL_HEIGHT) ---
  const wallH = TILE + WALL_HEIGHT
  const wall = make(
    new Graphics()
      .rect(0, 0, TILE, TILE)
      .fill(0x8a8fa3) // верх
      .rect(0, 0, TILE, 2)
      .fill(0xa9aec2)
      .rect(0, TILE, TILE, WALL_HEIGHT)
      .fill(0x5b6076) // фасад
      .rect(0, TILE, TILE, 2)
      .fill(0x4a4f63)
      .rect(0, wallH - 3, TILE, 3)
      .fill(0x3d4154),
    TILE,
    wallH,
  )

  // --- Дерево: стовбур унизу, крона зверху (перекриває гравця, що стоїть позаду) ---
  const treeH = TILE + TREE_HEIGHT
  const tree = make(
    new Graphics()
      .rect(TILE / 2 - 4, treeH - 20, 8, 20)
      .fill(0x6b4a2b)
      .circle(TILE / 2, 20, 17)
      .fill(0x2c6e3a)
      .circle(TILE / 2 - 6, 16, 9)
      .fill(0x3b8a4a)
      .circle(TILE / 2 + 7, 24, 7)
      .fill(0x24592f),
    TILE,
    treeH,
  )

  // --- Полуничка (предмет для збору) ---
  const berry = make(
    new Graphics()
      .circle(8, 10, 7)
      .fill(0xd7263d)
      .rect(3, 1, 10, 4)
      .fill(0x3fae4a)
      .rect(6, 8, 1, 1)
      .fill(0xffe08a)
      .rect(10, 11, 1, 1)
      .fill(0xffe08a),
    16,
    16,
  )

  // --- М'яка тінь ---
  const shadow = make(new Graphics().ellipse(10, 4, 10, 4).fill({ color: 0x000000, alpha: 0.35 }), 20, 8)

  return { grass, grassAlt, path, wall, tree, berry, shadow }
}

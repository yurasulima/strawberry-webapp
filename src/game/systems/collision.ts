import { TILE } from '../config'

/** Мінімальний інтерфейс карти, потрібний для колізій. */
export interface SolidGrid {
  isSolid(tx: number, ty: number): boolean
}

/** Хітбокс: позиція (x, y) — це "ноги" (центр низу), box росте вгору. */
export interface Body {
  x: number
  y: number
  halfWidth: number
  height: number
}

const EPS = 0.001

/**
 * Рух по осях окремо (X, потім Y): так сутність ковзає вздовж стін,
 * а не "прилипає" при русі по діагоналі.
 */
export function moveAndCollide(body: Body, dx: number, dy: number, grid: SolidGrid) {
  if (dx !== 0) {
    body.x += dx
    resolveX(body, dx, grid)
  }
  if (dy !== 0) {
    body.y += dy
    resolveY(body, dy, grid)
  }
}

function tileRange(body: Body) {
  return {
    tx0: Math.floor((body.x - body.halfWidth) / TILE),
    tx1: Math.floor((body.x + body.halfWidth - EPS) / TILE),
    ty0: Math.floor((body.y - body.height) / TILE),
    ty1: Math.floor((body.y - EPS) / TILE),
  }
}

function resolveX(body: Body, dx: number, grid: SolidGrid) {
  const { tx0, tx1, ty0, ty1 } = tileRange(body)
  for (let ty = ty0; ty <= ty1; ty++) {
    for (let tx = tx0; tx <= tx1; tx++) {
      if (!grid.isSolid(tx, ty)) continue
      body.x = dx > 0 ? tx * TILE - body.halfWidth - EPS : (tx + 1) * TILE + body.halfWidth + EPS
      return
    }
  }
}

function resolveY(body: Body, dy: number, grid: SolidGrid) {
  const { tx0, tx1, ty0, ty1 } = tileRange(body)
  for (let ty = ty0; ty <= ty1; ty++) {
    for (let tx = tx0; tx <= tx1; tx++) {
      if (!grid.isSolid(tx, ty)) continue
      body.y = dy > 0 ? ty * TILE - EPS : (ty + 1) * TILE + body.height + EPS
      return
    }
  }
}

/** Перетин хітбокса з колом (для підбору предметів). */
export function overlapsCircle(body: Body, cx: number, cy: number, r: number): boolean {
  const left = body.x - body.halfWidth
  const right = body.x + body.halfWidth
  const top = body.y - body.height
  const bottom = body.y
  const nx = Math.max(left, Math.min(cx, right))
  const ny = Math.max(top, Math.min(cy, bottom))
  return (cx - nx) ** 2 + (cy - ny) ** 2 <= r * r
}

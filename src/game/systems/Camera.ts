import type { Container } from 'pixi.js'
import { CAMERA, TILE, VIEW_TILES_HEIGHT } from '../config'
import type { Vec2 } from '../types'

/**
 * Камера рухає контейнер світу (а не кожен об'єкт).
 * Цілочисельний зум + округлення позиції дають чіткий піксель-арт без "мильності".
 */
export class Camera {
  x = 0
  y = 0
  zoom = 1
  private viewW = 1
  private viewH = 1
  private worldW = 0
  private worldH = 0

  constructor(private readonly world: Container) {}

  setWorldSize(width: number, height: number) {
    this.worldW = width
    this.worldH = height
  }

  resize(viewW: number, viewH: number) {
    this.viewW = viewW
    this.viewH = viewH
    this.zoom = Math.max(1, Math.floor(viewH / (VIEW_TILES_HEIGHT * TILE)))
    this.world.scale.set(this.zoom)
  }

  /** Миттєво ставить камеру на ціль (для старту сцени). */
  snapTo(target: Vec2) {
    this.x = target.x
    this.y = target.y
    this.apply()
  }

  /** Плавно наздоганяє ціль; незалежно від FPS (експоненційне згладжування). */
  follow(target: Vec2, dt: number) {
    const k = 1 - Math.exp(-CAMERA.followSharpness * dt)
    this.x += (target.x - this.x) * k
    this.y += (target.y - this.y) * k
    this.apply()
  }

  private apply() {
    const halfW = this.viewW / this.zoom / 2
    const halfH = this.viewH / this.zoom / 2

    // Якщо світ менший за екран, центруємо його; інакше не виходимо за краї.
    const cx = this.worldW <= halfW * 2 ? this.worldW / 2 : clamp(this.x, halfW, this.worldW - halfW)
    const cy = this.worldH <= halfH * 2 ? this.worldH / 2 : clamp(this.y, halfH, this.worldH - halfH)

    this.world.position.set(
      Math.round(this.viewW / 2 - cx * this.zoom),
      Math.round(this.viewH / 2 - cy * this.zoom),
    )
  }
}

function clamp(v: number, min: number, max: number) {
  return Math.min(max, Math.max(min, v))
}

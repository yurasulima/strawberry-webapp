import type { Container } from 'pixi.js'

/** Події, якими гра повідомляє Vue-шар (HUD, пауза). Викликаються рідко, не щокадру. */
export interface GameEvents {
  onCoins?: (coins: number) => void
  onFps?: (fps: number) => void
  onPause?: (paused: boolean) => void
}

export interface Scene {
  /** Корінь сцени, додається на stage. */
  readonly root: Container
  /** Логіка з фіксованим кроком (dt у секундах). */
  update(dt: number): void
  /** Викликається щокадру після update: камера, синхронізація візуалу. */
  render(dt: number): void
  resize(width: number, height: number): void
  destroy(): void
}

export interface Vec2 {
  x: number
  y: number
}

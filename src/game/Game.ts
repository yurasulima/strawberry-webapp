import { Application, type Ticker } from 'pixi.js'
import { COLORS, FIXED_STEP, MAX_STEPS_PER_FRAME } from './config'
import { LevelScene } from './scenes/LevelScene'
import { Input } from './systems/Input'
import type { GameEvents, Scene } from './types'

export interface GameOptions {
  host: HTMLElement
  events?: GameEvents
}

/**
 * Точка входу рушія. Нічого не знає про Vue: спілкується з ним лише через GameEvents.
 * Життєвий цикл: new Game() -> await init() -> destroy().
 */
export class Game {
  private readonly app = new Application()
  private readonly events: GameEvents
  private input: Input | null = null
  private scene: Scene | null = null
  private resizeObserver: ResizeObserver | null = null

  private accumulator = 0
  private paused = false
  private destroyed = false
  private initialized = false

  // лічильник FPS
  private fpsFrames = 0
  private fpsTime = 0

  constructor(private readonly options: GameOptions) {
    this.events = options.events ?? {}
  }

  async init() {
    const { host } = this.options

    await this.app.init({
      resizeTo: host,
      background: COLORS.background,
      antialias: false,
      autoDensity: true,
      resolution: Math.min(window.devicePixelRatio || 1, 2),
      roundPixels: true,
    })

    // Компонент могли розмонтувати, поки йшла асинхронна ініціалізація.
    if (this.destroyed) {
      this.app.destroy({ removeView: true }, { children: true, texture: true })
      return
    }
    this.initialized = true

    host.appendChild(this.app.canvas)
    this.app.canvas.style.display = 'block'
    this.app.canvas.style.touchAction = 'none'

    this.input = new Input()
    this.scene = new LevelScene(this.app, this.input, this.events)
    this.app.stage.addChild(this.scene.root)

    this.resizeObserver = new ResizeObserver(() => {
      this.scene?.resize(this.app.screen.width, this.app.screen.height)
    })
    this.resizeObserver.observe(host)

    document.addEventListener('visibilitychange', this.onVisibility)
    this.app.ticker.add(this.frame)
  }

  setPaused(paused: boolean) {
    if (this.paused === paused) return
    this.paused = paused
    this.accumulator = 0
    this.events.onPause?.(paused)
  }

  /** Стік для мобільного керування (-1..1 по обох осях). */
  setStick(x: number, y: number) {
    this.input?.setStick(x, y)
  }

  destroy() {
    if (this.destroyed) return
    this.destroyed = true
    // Якщо init() ще не завершився, його гілка сама знищить Application.
    if (!this.initialized) return

    document.removeEventListener('visibilitychange', this.onVisibility)
    this.resizeObserver?.disconnect()
    this.app.ticker.remove(this.frame)
    this.scene?.destroy()
    this.input?.destroy()
    // Текстури вже звільнила сцена, тому тут лише дерево об'єктів і canvas.
    this.app.destroy({ removeView: true }, { children: true })
    this.scene = null
    this.input = null
  }

  private frame = (ticker: Ticker) => {
    if (!this.scene || !this.input) return
    // Обмежуємо dt: після повернення на вкладку не робимо сотні кроків.
    const dt = Math.min(ticker.deltaMS / 1000, 0.1)

    if (this.input.wasPressed('Escape') || this.input.wasPressed('KeyP')) {
      this.setPaused(!this.paused)
    }

    if (!this.paused) {
      this.accumulator += dt
      let steps = 0
      while (this.accumulator >= FIXED_STEP && steps < MAX_STEPS_PER_FRAME) {
        this.scene.update(FIXED_STEP)
        this.accumulator -= FIXED_STEP
        steps++
      }
      if (steps === MAX_STEPS_PER_FRAME) this.accumulator = 0
      this.scene.render(dt)
    }

    this.input.endFrame()
    this.trackFps(dt)
  }

  private trackFps(dt: number) {
    this.fpsFrames++
    this.fpsTime += dt
    if (this.fpsTime >= 0.5) {
      this.events.onFps?.(Math.round(this.fpsFrames / this.fpsTime))
      this.fpsFrames = 0
      this.fpsTime = 0
    }
  }

  private onVisibility = () => {
    if (document.hidden) this.setPaused(true)
  }
}

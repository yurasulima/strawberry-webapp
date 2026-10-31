import type { Vec2 } from '../types'

const MOVE_KEYS: Record<string, 'up' | 'down' | 'left' | 'right'> = {
  KeyW: 'up',
  ArrowUp: 'up',
  KeyS: 'down',
  ArrowDown: 'down',
  KeyA: 'left',
  ArrowLeft: 'left',
  KeyD: 'right',
  ArrowRight: 'right',
}

const PREVENT_DEFAULT = new Set(['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'])

/** Клавіатурний ввід + віртуальний стік (для мобільного/Telegram). */
export class Input {
  private down = new Set<string>()
  private pressedOnce = new Set<string>()
  private stick: Vec2 = { x: 0, y: 0 }

  constructor() {
    window.addEventListener('keydown', this.onKeyDown)
    window.addEventListener('keyup', this.onKeyUp)
    window.addEventListener('blur', this.reset)
  }

  /** Нормалізований напрямок руху (довжина <= 1), діагональ не швидша за пряму. */
  getMove(): Vec2 {
    let x = 0
    let y = 0
    for (const [code, dir] of Object.entries(MOVE_KEYS)) {
      if (!this.down.has(code)) continue
      if (dir === 'left') x -= 1
      else if (dir === 'right') x += 1
      else if (dir === 'up') y -= 1
      else y += 1
    }
    // Клавіатура вже дає +-1; якщо вона не натиснута, беремо стік.
    if (x === 0 && y === 0) {
      x = this.stick.x
      y = this.stick.y
    }
    const len = Math.hypot(x, y)
    if (len > 1) {
      x /= len
      y /= len
    }
    return { x, y }
  }

  /** true один раз після натискання (скидається у endFrame). */
  wasPressed(code: string): boolean {
    return this.pressedOnce.has(code)
  }

  setStick(x: number, y: number) {
    this.stick = { x, y }
  }

  endFrame() {
    this.pressedOnce.clear()
  }

  destroy() {
    window.removeEventListener('keydown', this.onKeyDown)
    window.removeEventListener('keyup', this.onKeyUp)
    window.removeEventListener('blur', this.reset)
    this.reset()
  }

  private reset = () => {
    this.down.clear()
    this.pressedOnce.clear()
    this.stick = { x: 0, y: 0 }
  }

  private onKeyDown = (e: KeyboardEvent) => {
    if (isTypingTarget(e.target)) return
    if (PREVENT_DEFAULT.has(e.code)) e.preventDefault()
    if (!e.repeat) this.pressedOnce.add(e.code)
    this.down.add(e.code)
  }

  private onKeyUp = (e: KeyboardEvent) => {
    this.down.delete(e.code)
  }
}

function isTypingTarget(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null
  if (!el) return false
  return el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable
}

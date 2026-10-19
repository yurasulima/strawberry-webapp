class SoundEngine {
  private ctx: AudioContext | null = null
  private buffers: Map<string, AudioBuffer> = new Map()

  private getContext(): AudioContext | null {
    if (typeof window === 'undefined') return null
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext
      if (AudioCtx) {
        this.ctx = new AudioCtx()
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {})
    }
    return this.ctx
  }

  async loadSound(key: string, url: string) {
    try {
      const res = await fetch(url)
      const arrayBuffer = await res.arrayBuffer()
      const ctx = this.getContext()
      if (ctx) {
        const audioBuffer = await ctx.decodeAudioData(arrayBuffer)
        this.buffers.set(key, audioBuffer)
      }
    } catch (e) {
      console.warn('Failed to load sound:', key, e)
    }
  }

  playSound(key: string, volume = 0.5) {
    const ctx = this.getContext()
    const buffer = this.buffers.get(key)
    if (!ctx || !buffer) return

    try {
      const source = ctx.createBufferSource()
      source.buffer = buffer

      const gainNode = ctx.createGain()
      gainNode.gain.value = volume

      source.connect(gainNode)
      gainNode.connect(ctx.destination)

      source.start(0)
    } catch (e) {
      console.warn('Sound play error:', e)
    }
  }
}

const engine = new SoundEngine()

// Попереднє завантаження аудіофайлів у пам'ять
if (typeof window !== 'undefined') {
  engine.loadSound('tab', '/honeywood/sounds/ui_tab.ogg')
  engine.loadSound('click', '/honeywood/sounds/ui_click.ogg')
  engine.loadSound('harvest', '/click.mp3')
  engine.loadSound('purchase', '/honeywood/sounds/purchase.ogg')
  engine.loadSound('coin', '/honeywood/sounds/coin_few.ogg')
}

export function playTabSound() {
  engine.playSound('tab', 0.4)
}

export function playClickSound() {
  engine.playSound('click', 0.4)
}

export function playHarvestSound() {
  engine.playSound('harvest', 0.25)
}

export function playPurchaseSound() {
  engine.playSound('purchase', 0.5)
}

export function playCoinSound() {
  engine.playSound('coin', 0.5)
}

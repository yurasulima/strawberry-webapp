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
      if (!res.ok) {
        console.warn(`Sound file not found (${res.status}): ${url}`)
        return
      }
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
    if (!soundEnabled) return
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

let soundEnabled = true
let musicEnabled = true

if (typeof window !== 'undefined') {
  const savedSound = localStorage.getItem('sound_enabled')
  if (savedSound !== null) soundEnabled = savedSound === 'true'

  const savedMusic = localStorage.getItem('music_enabled')
  if (savedMusic !== null) musicEnabled = savedMusic === 'true'
}

export function isSoundEnabled(): boolean {
  return soundEnabled
}

export function setSoundEnabled(enabled: boolean) {
  soundEnabled = enabled
  if (typeof window !== 'undefined') {
    localStorage.setItem('sound_enabled', enabled ? 'true' : 'false')
  }
}

export function isMusicEnabled(): boolean {
  return musicEnabled
}

export function setMusicEnabled(enabled: boolean) {
  musicEnabled = enabled
  if (typeof window !== 'undefined') {
    localStorage.setItem('music_enabled', enabled ? 'true' : 'false')
  }
}

const engine = new SoundEngine()

// Попереднє завантаження аудіофайлів у пам'ять із нових ассетів sfx/
if (typeof window !== 'undefined') {
  engine.loadSound('tab', '/sfx/tab-switch-1.wav')
  engine.loadSound('click', '/sfx/click-wood-1.wav')
  engine.loadSound('harvest', '/click.mp3')
  engine.loadSound('purchase', '/sfx/confirm-1.wav')
  engine.loadSound('coin', '/sfx/coin.wav')
  engine.loadSound('success', '/sfx/success-1.wav')
  engine.loadSound('error', '/sfx/error-1.wav')
  engine.loadSound('popupOpen', '/sfx/popup-open.wav')
  engine.loadSound('popupClose', '/sfx/popup-close.wav')
  engine.loadSound('pluck', '/sfx/click-bubble-1.wav')
  engine.loadSound('itemGet', '/sfx/item-get.wav')
  engine.loadSound('snap', '/sfx/error-2.wav')
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

export function playSuccessSound() {
  engine.playSound('success', 0.5)
}

export function playErrorSound() {
  engine.playSound('error', 0.5)
}

export function playPopupOpenSound() {
  engine.playSound('popupOpen', 0.5)
}

export function playPopupCloseSound() {
  engine.playSound('popupClose', 0.5)
}

export function playPluckSound() {
  engine.playSound('pluck', 0.5)
}

export function playItemGetSound() {
  engine.playSound('itemGet', 0.6)
}

export function playSnapSound() {
  engine.playSound('snap', 0.6)
}

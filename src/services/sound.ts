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

  playSound(key: string, volume = 0.5): AudioBufferSourceNode | null {
    if (!soundEnabled) return null
    const ctx = this.getContext()
    const buffer = this.buffers.get(key)
    if (!ctx || !buffer) return null

    try {
      const source = ctx.createBufferSource()
      source.buffer = buffer

      const gainNode = ctx.createGain()
      gainNode.gain.value = volume

      source.connect(gainNode)
      gainNode.connect(ctx.destination)

      source.start(0)
      return source
    } catch (e) {
      console.warn('Sound play error:', e)
      return null
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

/* ---------- Фонова музика (song_1.mp3) ---------- */

let bgMusicAudio: HTMLAudioElement | null = null
let bgMusicStarted = false

function initBgMusic() {
  if (typeof window === 'undefined' || bgMusicAudio) return
  bgMusicAudio = new Audio('/music/song_1.mp3')
  bgMusicAudio.loop = true
  bgMusicAudio.volume = 0.35 // Приємна фонова гучність
}

export function startBgMusic() {
  if (typeof window === 'undefined') return
  initBgMusic()
  if (!bgMusicAudio) return

  if (musicEnabled) {
    bgMusicAudio.play().then(() => {
      bgMusicStarted = true
    }).catch(() => {
      bgMusicStarted = false
    })
  } else {
    bgMusicAudio.pause()
  }
}

export function stopBgMusic() {
  if (bgMusicAudio) {
    bgMusicAudio.pause()
  }
}

export function setMusicEnabled(enabled: boolean) {
  musicEnabled = enabled
  if (typeof window !== 'undefined') {
    localStorage.setItem('music_enabled', enabled ? 'true' : 'false')
  }
  if (bgMusicAudio) {
    if (enabled) {
      bgMusicAudio.play().catch(() => {})
    } else {
      bgMusicAudio.pause()
    }
  } else if (enabled) {
    startBgMusic()
  }
}

// Автоматично запускаємо музику або чекаємо першого жесту користувача (згідно з Autoplay Policy)
if (typeof window !== 'undefined') {
  const tryStartMusic = () => {
    if (musicEnabled) {
      startBgMusic()
    }
    if (bgMusicStarted) {
      window.removeEventListener('pointerdown', tryStartMusic)
      window.removeEventListener('click', tryStartMusic)
      window.removeEventListener('touchend', tryStartMusic)
    }
  }

  startBgMusic()
  window.addEventListener('pointerdown', tryStartMusic, { passive: true })
  window.addEventListener('click', tryStartMusic, { passive: true })
  window.addEventListener('touchend', tryStartMusic, { passive: true })
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
  engine.loadSound('meow', '/cats/meow_1.mp3')
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

let meowSource: AudioBufferSourceNode | null = null

export function isMeowing(): boolean {
  return meowSource !== null
}

export function stopMeow() {
  if (!meowSource) return
  try { meowSource.stop() } catch {}
  meowSource = null
}

// Нявкає, лише якщо зараз не грає інше нявкання чи мурчання
export function playMeowSound() {
  if (meowSource || isPurring()) return
  const src = engine.playSound('meow', 0.6)
  if (!src) return
  meowSource = src
  src.onended = () => {
    if (meowSource === src) meowSource = null
  }
}

/* ---------- Мурчання котика (mur.mp3) ---------- */

let purrAudio: HTMLAudioElement | null = null
let purrFadeTimer: ReturnType<typeof setInterval> | null = null
const PURR_VOLUME = 0.6

function clearPurrFade() {
  if (purrFadeTimer) {
    clearInterval(purrFadeTimer)
    purrFadeTimer = null
  }
}

export function isPurring(): boolean {
  return !!purrAudio && !purrAudio.paused
}

export function startPurr() {
  if (typeof window === 'undefined' || !soundEnabled) return
  if (!purrAudio) {
    purrAudio = new Audio('/cats/mur.mp3')
    purrAudio.loop = true
  }
  stopMeow()
  clearPurrFade()
  purrAudio.volume = PURR_VOLUME
  if (purrAudio.paused) {
    purrAudio.currentTime = 0
    purrAudio.play().catch(() => {})
  }
}

export function stopPurr(fadeMs = 600) {
  if (!purrAudio || purrAudio.paused) return
  clearPurrFade()
  const audio = purrAudio
  const steps = 12
  const stepMs = Math.max(10, fadeMs / steps)
  let i = 0
  purrFadeTimer = setInterval(() => {
    i++
    audio.volume = Math.max(0, PURR_VOLUME * (1 - i / steps))
    if (i >= steps) {
      clearPurrFade()
      audio.pause()
      audio.volume = PURR_VOLUME
    }
  }, stepMs)
}
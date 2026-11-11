// Перефарбування спрайта котика по зонах.
// Працює з двома текстурами:
//   cat_gray.png  - яскравість пікселя (R=G=B)
//   cat_zones.png - id зони у каналі R (0 = фіксовані пікселі)
//
// Формула для зони: out = колір_зони * (яскравість_пікселя / яскравість_дефолтного_кольору).
// Тому з дефолтними кольорами спрайт виглядає як оригінал, а тіні й світлі
// відтінки зберігаються при будь-якому іншому кольорі.

export type ZoneKey = 'fur' | 'markings' | 'belly' | 'accent' | 'collar'
export type CatColors = Partial<Record<ZoneKey, string>>
type RGB = [number, number, number]

export interface ZoneDef {
  id: number
  key: ZoneKey
  label: string
  /** Основний колір зони в оригінальному спрайті */
  defaultColor: string
}

export const ZONE_DEFS: ZoneDef[] = [
  { id: 1, key: 'fur', label: 'Шерсть', defaultColor: '#fdd5b5' },
  { id: 2, key: 'markings', label: 'Смужки та тіні', defaultColor: '#e6b4a0' },
  { id: 3, key: 'belly', label: 'Живіт і лапки', defaultColor: '#fef5e6' },
  { id: 4, key: 'accent', label: 'Щічки та вуха', defaultColor: '#eb9486' },
  { id: 5, key: 'collar', label: 'Нашийник', defaultColor: '#e3baad' }
]

export function hexToRgb(hex: string): RGB {
  let h = hex.trim().replace('#', '')
  if (h.length === 3) h = h.split('').map(c => c + c).join('')
  const n = parseInt(h, 16)
  if (h.length !== 6 || Number.isNaN(n)) return [255, 255, 255]
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

export function luminance(r: number, g: number, b: number): number {
  return Math.round(0.299 * r + 0.587 * g + 0.114 * b)
}

const clamp255 = (v: number) => (v < 0 ? 0 : v > 255 ? 255 : v)

interface PaletteEntry {
  color: RGB
  /** 1 / яскравість дефолтного кольору */
  invRef: number
}

/** Збирає палітру: id зони -> колір і коефіцієнт яскравості */
export function buildPalette(colors: CatColors): Record<number, PaletteEntry> {
  const def = (key: ZoneKey) => hexToRgb(ZONE_DEFS.find(z => z.key === key)!.defaultColor)

  const resolved: Record<ZoneKey, RGB> = {
    fur: colors.fur ? hexToRgb(colors.fur) : def('fur'),
    markings: def('markings'),
    belly: colors.belly ? hexToRgb(colors.belly) : def('belly'),
    accent: colors.accent ? hexToRgb(colors.accent) : def('accent'),
    collar: colors.collar ? hexToRgb(colors.collar) : def('collar')
  }

  if (colors.markings) {
    resolved.markings = hexToRgb(colors.markings)
  } else if (colors.fur) {
    // Смужки не задані: тягнемо їх за шерстю, трохи темніші, як в оригіналі
    const fd = def('fur')
    const md = def('markings')
    resolved.markings = [
      clamp255(Math.round(resolved.fur[0] * (md[0] / fd[0]))),
      clamp255(Math.round(resolved.fur[1] * (md[1] / fd[1]))),
      clamp255(Math.round(resolved.fur[2] * (md[2] / fd[2])))
    ]
  }

  const palette: Record<number, PaletteEntry> = {}
  for (const z of ZONE_DEFS) {
    const d = hexToRgb(z.defaultColor)
    palette[z.id] = {
      color: resolved[z.key],
      invRef: 1 / luminance(d[0], d[1], d[2])
    }
  }
  return palette
}

/**
 * Перефарбовує всю стрічку кадрів.
 * gray і zones: RGBA-дані однакового розміру (як з getImageData).
 */
export function recolorStrip(
  gray: Uint8ClampedArray,
  zones: Uint8ClampedArray,
  colors: CatColors
): Uint8ClampedArray {
  const palette = buildPalette(colors)
  const out = new Uint8ClampedArray(gray.length)

  for (let i = 0; i < gray.length; i += 4) {
    const a = gray[i + 3]
    if (a === 0) continue

    const g = gray[i]
    const zone = zones[i]
    const p = palette[zone]

    if (!p) {
      // Фіксовані пікселі (контур, очі, блики): лишаємо як є
      out[i] = g
      out[i + 1] = g
      out[i + 2] = g
    } else {
      const k = g * p.invRef
      out[i] = clamp255(Math.round(p.color[0] * k))
      out[i + 1] = clamp255(Math.round(p.color[1] * k))
      out[i + 2] = clamp255(Math.round(p.color[2] * k))
    }
    out[i + 3] = a
  }
  return out
}

// ---- Завантаження текстур у браузері (кеш на рівні модуля) ----

export interface CatTextures {
  gray: Uint8ClampedArray
  zones: Uint8ClampedArray
  width: number
  height: number
}

const textureCache = new Map<string, Promise<CatTextures>>()

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error(`Не вдалося завантажити ${src}`))
    img.src = src
  })
}

function readPixels(img: HTMLImageElement): Uint8ClampedArray {
  const c = document.createElement('canvas')
  c.width = img.naturalWidth
  c.height = img.naturalHeight
  const ctx = c.getContext('2d', { willReadFrequently: true })!
  ctx.imageSmoothingEnabled = false
  ctx.drawImage(img, 0, 0)
  return ctx.getImageData(0, 0, c.width, c.height).data
}

export function loadCatTextures(graySrc: string, zonesSrc: string): Promise<CatTextures> {
  const key = `${graySrc}|${zonesSrc}`
  let cached = textureCache.get(key)
  if (!cached) {
    cached = Promise.all([loadImage(graySrc), loadImage(zonesSrc)]).then(([g, z]) => ({
      gray: readPixels(g),
      zones: readPixels(z),
      width: g.naturalWidth,
      height: g.naturalHeight
    }))
    // Якщо завантаження впало, наступна спроба має почати заново
    cached.catch(() => textureCache.delete(key))
    textureCache.set(key, cached)
  }
  return cached
}

// ───── Оцінка рідкісності котика за його генетикою кольорів ─────

export type CatRarityTier = 'COMMON' | 'RARE' | 'EPIC' | 'LEGENDARY' | 'MYTHIC'

export interface RarityResult {
  tier: CatRarityTier
  score: number
  label: string
  color: string
  bg: string
  border: string
}

export function evaluateCatRarity(colors?: CatColors): RarityResult {
  if (!colors || !colors.fur) {
    return { tier: 'COMMON', score: 10, label: 'Звичайний', color: '#a8a29e', bg: 'rgba(168, 162, 158, 0.2)', border: '#78716c' }
  }

  const hexToHsl = (hex?: string) => {
    if (!hex) return { h: 0, s: 0, l: 50 }
    const [r, g, b] = hexToRgb(hex)
    const rN = r / 255
    const gN = g / 255
    const bN = b / 255
    const max = Math.max(rN, gN, bN)
    const min = Math.min(rN, gN, bN)
    let h = 0
    let s = 0
    const l = (max + min) / 2
    if (max !== min) {
      const d = max - min
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
      switch (max) {
        case rN: h = (gN - bN) / d + (gN < bN ? 6 : 0); break
        case gN: h = (bN - rN) / d + 2; break
        case bN: h = (rN - gN) / d + 4; break
      }
      h /= 6
    }
    return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) }
  }

  const fur = hexToHsl(colors.fur)
  const markings = hexToHsl(colors.markings)
  const belly = hexToHsl(colors.belly)
  const accent = hexToHsl(colors.accent)
  const collar = hexToHsl(colors.collar)

  let score = 0

  // 1. Оцінка унікальності відтінку шерсті (Rare / Epic / Legendary / Mythic Hues)
  const isGold = (fur.h >= 38 && fur.h <= 56 && fur.s >= 65 && fur.l >= 45 && fur.l <= 75)
  const isSakura = ((fur.h >= 335 || fur.h <= 14) && fur.s >= 55 && fur.l >= 65)
  const isLavender = (fur.h >= 255 && fur.h <= 295 && fur.s >= 45 && fur.l >= 55)
  const isMintEmerald = (fur.h >= 140 && fur.h <= 180 && fur.s >= 45 && fur.l >= 45)
  const isCyberNeon = (fur.s >= 80 && (fur.h >= 170 && fur.h <= 320))

  if (isGold) score += 50                 // Золото / Бурштин -> кандидат на Legendary/Mythic
  else if (isCyberNeon) score += 42       // Кібер Неон -> кандидат на Legendary/Mythic
  else if (isSakura) score += 35          // Рожева сакура -> кандидат на Epic/Legendary
  else if (isLavender) score += 28        // Лаванда -> кандидат на Epic
  else if (isMintEmerald) score += 28     // М'ята / Смарагд -> кандидат на Epic

  // 2. Породи та патерни (Siamese, Tuxedo, Calico)
  const isSiamese = (fur.l >= 75 && fur.s <= 55 && markings.l <= 35 && belly.l >= 88)
  const isTuxedo = (fur.l <= 25 && belly.l >= 88)
  const isCalico = (fur.h >= 15 && fur.h <= 40 && fur.s >= 70 && markings.l <= 32 && belly.l >= 88)

  if (isSiamese) score += 24              // Сіамський -> Rare
  else if (isCalico) score += 22          // Триколірний -> Rare
  else if (isTuxedo) score += 20          // Смокінг -> Rare

  // 3. Гармонійний контраст смужок та акцентів
  const hueDiff = Math.abs(fur.h - markings.h)
  const wrappedHueDiff = Math.min(hueDiff, 360 - hueDiff)
  if (wrappedHueDiff > 80) score += 15
  else if (wrappedHueDiff > 40) score += 8

  // 4. Акцент та нашийник (неонові/яскраві дрібні деталі)
  if (collar.s > 80 && Math.abs(collar.h - fur.h) > 50) score += 10
  if (accent.s > 75) score += 10

  // Поріг тирів рідкісності:
  // COMMON:    0 .. 24
  // RARE:     25 .. 44
  // EPIC:     45 .. 64
  // LEGENDARY: 65 .. 84
  // MYTHIC:    85+
  let tier: CatRarityTier = 'COMMON'
  let label = 'Звичайний'
  let color = '#a8a29e'
  let bg = 'rgba(168, 162, 158, 0.2)'
  let border = '#78716c'

  if (score >= 85) {
    tier = 'MYTHIC'
    label = 'Міфічний'
    color = '#ff2a5f'
    bg = 'rgba(255, 42, 95, 0.25)'
    border = '#ff2a5f'
  } else if (score >= 65) {
    tier = 'LEGENDARY'
    label = 'Легендарний'
    color = '#ffc107'
    bg = 'rgba(255, 193, 7, 0.25)'
    border = '#ffc107'
  } else if (score >= 45) {
    tier = 'EPIC'
    label = 'Епічний'
    color = '#c084fc'
    bg = 'rgba(192, 132, 252, 0.25)'
    border = '#a855f7'
  } else if (score >= 25) {
    tier = 'RARE'
    label = 'Рідкісний'
    color = '#38bdf8'
    bg = 'rgba(56, 189, 248, 0.25)'
    border = '#0284c7'
  }

  return { tier, score, label, color, bg, border }
}

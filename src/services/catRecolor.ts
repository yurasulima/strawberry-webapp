// Перефарбування спрайта котика по зонах.
// Працює з двома текстурами:
//   cat_gray.png  - яскравість пікселя (R=G=B)
//   cat_zones_old.png - id зони у каналі R (0 = фіксовані пікселі)
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

import { ref, watch } from 'vue'

const STORAGE_KEY = 'global_item_outline'

function getInitialOutlineState(): boolean {
  if (typeof localStorage !== 'undefined') {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved !== null) {
      return saved === 'true'
    }
  }
  return true // Enabled globally by default
}

export const isGlobalItemOutlineEnabled = ref<boolean>(getInitialOutlineState())

watch(isGlobalItemOutlineEnabled, (newVal) => {
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem(STORAGE_KEY, String(newVal))
  }
})

export function setGlobalItemOutline(enabled: boolean) {
  isGlobalItemOutlineEnabled.value = enabled
}

export interface OutlineColor {
  r: number
  g: number
  b: number
  a: number
}

const DEFAULT_WHITE_OUTLINE: OutlineColor = { r: 255, g: 255, b: 255, a: 255 }

const outlineCache = new Map<string, Promise<string>>()

/**
 * Generates an outlined texture in runtime on canvas.
 * For every empty (transparent) pixel adjacent (4-directional: up, down, left, right)
 * to a non-transparent pixel in the texture, 1 white pixel (or custom color) is added.
 */
export function getOutlinedTexture(
  src: string,
  color: OutlineColor = DEFAULT_WHITE_OUTLINE
): Promise<string> {
  if (!src) return Promise.resolve(src)
  if (typeof window === 'undefined') return Promise.resolve(src)

  const cacheKey = `${src}_outline_${color.r}_${color.g}_${color.b}_${color.a}`
  if (outlineCache.has(cacheKey)) {
    return outlineCache.get(cacheKey)!
  }

  const promise = new Promise<string>((resolve) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'

    img.onload = () => {
      try {
        const origW = img.naturalWidth || img.width
        const origH = img.naturalHeight || img.height

        if (!origW || !origH) {
          resolve(src)
          return
        }

        // Expand canvas size by 2px (1px padding on all sides) so edge pixels get complete outline
        const width = origW + 2
        const height = origH + 2

        const canvas = document.createElement('canvas')
        canvas.width = width
        canvas.height = height

        const ctx = canvas.getContext('2d', { willReadFrequently: true })
        if (!ctx) {
          resolve(src)
          return
        }

        // Draw original texture offset by (1, 1)
        ctx.drawImage(img, 1, 1, origW, origH)

        const imgData = ctx.getImageData(0, 0, width, height)
        const data = imgData.data

        // Build opacity mask of original pixels (1 = opaque, 0 = transparent)
        const isOpaque = new Uint8Array(width * height)
        for (let y = 0; y < height; y++) {
          for (let x = 0; x < width; x++) {
            const alphaIndex = (y * width + x) * 4 + 3
            if (data[alphaIndex] > 10) {
              isOpaque[y * width + x] = 1
            }
          }
        }

        const resultData = ctx.createImageData(width, height)
        const res = resultData.data

        // 4-directional outline pass
        for (let y = 0; y < height; y++) {
          for (let x = 0; x < width; x++) {
            const idx = (y * width + x) * 4
            const opaque = isOpaque[y * width + x]

            if (opaque) {
              // Copy original pixel
              res[idx] = data[idx]
              res[idx + 1] = data[idx + 1]
              res[idx + 2] = data[idx + 2]
              res[idx + 3] = data[idx + 3]
            } else {
              // Check adjacent empty neighbor pixels (left, right, up, down)
              let hasOpaqueNeighbor = false

              if (x > 0 && isOpaque[y * width + (x - 1)]) {
                hasOpaqueNeighbor = true
              } else if (x < width - 1 && isOpaque[y * width + (x + 1)]) {
                hasOpaqueNeighbor = true
              } else if (y > 0 && isOpaque[(y - 1) * width + x]) {
                hasOpaqueNeighbor = true
              } else if (y < height - 1 && isOpaque[(y + 1) * width + x]) {
                hasOpaqueNeighbor = true
              }

              if (hasOpaqueNeighbor) {
                // Add 1 outline pixel
                res[idx] = color.r
                res[idx + 1] = color.g
                res[idx + 2] = color.b
                res[idx + 3] = color.a
              } else {
                // Transparent
                res[idx] = 0
                res[idx + 1] = 0
                res[idx + 2] = 0
                res[idx + 3] = 0
              }
            }
          }
        }

        ctx.putImageData(resultData, 0, 0)
        const dataUrl = canvas.toDataURL('image/png')
        resolve(dataUrl)
      } catch (err) {
        console.warn('Failed to generate outline for image:', src, err)
        resolve(src)
      }
    }

    img.onerror = () => {
      resolve(src)
    }

    img.src = src
  })

  outlineCache.set(cacheKey, promise)
  return promise
}

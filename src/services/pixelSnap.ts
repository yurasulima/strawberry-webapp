import { ref } from 'vue'

/** Реактивний devicePixelRatio (змінюється при зумі / переносі вікна між моніторами). */
export const dpr = ref<number>(typeof window === 'undefined' ? 1 : window.devicePixelRatio || 1)

function watchDpr() {
  if (typeof window === 'undefined' || !window.matchMedia) return
  const mq = window.matchMedia(`(resolution: ${dpr.value}dppx)`)
  mq.addEventListener(
    'change',
    () => {
      dpr.value = window.devicePixelRatio || 1
      watchDpr()
    },
    { once: true }
  )
}
watchDpr()

/** '24' | 24 | '24px' -> 24; усе інше (%, rem, auto) -> null */
export function toPx(value: number | string | undefined | null): number | null {
  if (value === undefined || value === null || value === '') return null
  if (typeof value === 'number') return value
  const m = /^(\d+(?:\.\d+)?)(px)?$/.exec(value.trim())
  return m ? parseFloat(m[1]) : null
}

/**
 * Розмір, при якому 1 піксель текстури = рівно k фізичних пікселів екрана (k - ціле >= 1).
 * Повертає CSS-розмір (дробовий при дробовому DPR, але в фізичних пікселях завжди цілий).
 */
export function snapContain(
  boxW: number,
  boxH: number,
  natW: number,
  natH: number,
  ratio: number = dpr.value
) {
  const k = Math.max(1, Math.round(Math.min((boxW * ratio) / natW, (boxH * ratio) / natH)))
  return { k, width: (natW * k) / ratio, height: (natH * k) / ratio }
}

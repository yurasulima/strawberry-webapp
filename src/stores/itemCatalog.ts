import { defineStore } from 'pinia'
import { ref } from 'vue'
import api from '@/services/api'
import { useAuthStore } from '@/stores/auth'
import { getOutlinedTexture, isGlobalItemOutlineEnabled } from '@/services/itemOutline'
import type { Item } from '@/types/Item'

const STALE_AFTER_MS = 5 * 60 * 1000
const PRELOAD_TIMEOUT_MS = 4000
const PRELOAD_CONCURRENCY = 8

export function normalizeItemName(name: string): string {
  return name.toLowerCase().trim().replace(/[\s-]+/g, '_')
}

/** Завантажує картинку в кеш браузера. Ніколи не reject-ить: помилка = просто немає картинки. */
function loadImage(url: string): Promise<void> {
  return new Promise((resolve) => {
    const img = new Image()
    // crossOrigin — щоб кешована відповідь підійшла і для canvas-контуру (itemOutline.ts)
    img.crossOrigin = 'anonymous'
    img.onload = () => resolve()
    img.onerror = () => resolve()
    img.src = url
  })
}

/** Картинка в кеші + (якщо ввімкнено) готовий контур — те, що потім покаже ItemIcon. */
async function warmTexture(url: string): Promise<void> {
  await loadImage(url)
  if (isGlobalItemOutlineEnabled.value) {
    await getOutlinedTexture(url)
  }
}

async function warmMany(urls: string[]): Promise<void> {
  const queue = [...urls]
  const worker = async () => {
    while (queue.length) {
      const url = queue.shift()!
      try {
        await warmTexture(url)
      } catch {
        /* текстура не критична */
      }
    }
  }
  await Promise.all(Array.from({ length: Math.min(PRELOAD_CONCURRENCY, queue.length) }, worker))
}

/**
 * Каталог предметів з бекенду (GET /items): назви по мовах і версії текстур.
 * Завантажується на сплеші разом із прелоадом усіх текстур, далі мовчки оновлюється
 * раз на кілька хвилин і примусово — після змін в адмінці.
 * Нові предмети з'являються в грі без перезбірки фронтенду.
 */
export const useItemCatalogStore = defineStore('itemCatalog', () => {
  const byName = ref<Record<string, Item>>({})
  const loaded = ref(false)
  let loadedAt = 0
  let inflight: Promise<void> | null = null
  let warming: Promise<void> = Promise.resolve()
  const warmed = new Set<string>()

  function apiBase(): string {
    return String(api.defaults.baseURL ?? '').replace(/\/+$/, '')
  }

  function get(name: string): Item | undefined {
    return byName.value[normalizeItemName(name)]
  }

  /** URL динамічної текстури або null, якщо в предмета її немає. */
  function iconUrl(name: string): string | null {
    const key = normalizeItemName(name)
    const item = byName.value[key]
    if (!item?.iconVersion) return null
    return `${apiBase()}/public/item-icons/${key}.png?v=${item.iconVersion}`
  }

  /** Той самий URL, який покаже ItemIcon: динамічний або статичний зі збірки. */
  function textureUrl(name: string): string {
    const key = normalizeItemName(name)
    return iconUrl(key) ?? `/items/${key}.png`
  }

  function setItems(list: Item[]) {
    const next: Record<string, Item> = {}
    for (const it of list) next[normalizeItemName(it.name)] = it
    byName.value = next

    // Прогріваємо лише те, чого ще не прогрівали (URL із ?v= змінюється разом з текстурою).
    const fresh = list.map(it => textureUrl(it.name)).filter(url => !warmed.has(url))
    fresh.forEach(url => warmed.add(url))
    warming = warmMany(fresh)
  }

  async function load(force = false): Promise<void> {
    if (inflight) {
      if (!force) return inflight
      await inflight
    }
    if (!force && loaded.value) return
    if (!useAuthStore().token) return // /items потребує авторизації; повторимо пізніше

    inflight = (async () => {
      try {
        const res = await api.get<Item[]>('/items')
        setItems(res.data || [])
        loaded.value = true
        loadedAt = Date.now()
      } catch (err) {
        console.error('Failed to load item catalog:', err)
      } finally {
        inflight = null
      }
    })()
    return inflight
  }

  /**
   * Для сплеша: завантажує каталог і прогріває всі текстури (+ контури).
   * Ніколи не кидає помилку й не чекає довше за PRELOAD_TIMEOUT_MS —
   * якщо мережа повільна, гра стартує, а текстури догрузяться в фоні.
   */
  async function preloadAll(timeoutMs = PRELOAD_TIMEOUT_MS): Promise<void> {
    let timer: ReturnType<typeof setTimeout> | undefined
    const timeout = new Promise<void>((resolve) => {
      timer = setTimeout(resolve, timeoutMs)
    })
    try {
      await Promise.race([
        (async () => {
          await load(loaded.value)
          await warming
        })(),
        timeout,
      ])
    } catch (err) {
      console.error('Item preload failed:', err)
    } finally {
      clearTimeout(timer)
    }
  }

  /** Дешева перевірка для викликів з компонентів: завантажує, якщо ще не було або застаріло. */
  function ensureLoaded() {
    if (!loaded.value || Date.now() - loadedAt > STALE_AFTER_MS) {
      void load(loaded.value)
    }
  }

  return { byName, loaded, get, iconUrl, textureUrl, load, preloadAll, ensureLoaded }
})

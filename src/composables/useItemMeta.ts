import { useI18n } from 'vue-i18n'
import { useItemCatalogStore } from '@/stores/itemCatalog'

export interface ItemNames {
  nameUk?: string | null
  nameEn?: string | null
  nameRu?: string | null
}

const FIELD_BY_LOCALE: Record<string, keyof ItemNames> = {
  uk: 'nameUk',
  en: 'nameEn',
  ru: 'nameRu',
}

export function humanizeItemName(name: string): string {
  return name.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}

/**
 * Назва предмета для поточної мови. Порядок:
 *   1. назва з БД для поточної мови (задана в адмінці)
 *   2. inventory.items.<key> з locales/*.json (старі предмети)
 *   3. англійська назва з БД
 *   4. ключ у «читабельному» вигляді
 */
export function useItemMeta() {
  const { t, te, locale } = useI18n()
  const catalog = useItemCatalogStore()
  catalog.ensureLoaded()

  function itemTitle(name?: string | null, item?: ItemNames | null): string {
    if (!name) return ''
    const key = name.toLowerCase().trim()
    const meta: ItemNames | undefined = item ?? catalog.get(key)

    const field = FIELD_BY_LOCALE[locale.value]
    const own = field ? meta?.[field] : null
    if (own) return own

    const i18nKey = `inventory.items.${key}`
    if (te(i18nKey)) return t(i18nKey)

    return meta?.nameEn || humanizeItemName(name)
  }

  function itemIconUrl(name: string): string {
    return catalog.iconUrl(name) ?? `/items/${name.toLowerCase().trim()}.png`
  }

  return { itemTitle, itemIconUrl }
}

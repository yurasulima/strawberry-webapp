export interface Item {
    id: number
    name: string
    sellPrice?: number
    buyPrice?: number
    /** Назви по мовах — задаються в адмінці, мають пріоритет над locales/*.json */
    nameUk?: string | null
    nameEn?: string | null
    nameRu?: string | null
    /** null/undefined — власної текстури немає, беремо /items/<name>.png зі збірки */
    iconVersion?: number | null
}

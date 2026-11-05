export function formatBizName(rawName?: string, t?: (key: string) => string, te?: (key: string) => boolean): string {
  if (!rawName) return t ? t('business.default_name') : 'Business'
  const clean = rawName.toLowerCase().trim()
  const key = `business.names.${clean}`
  if (te && t && te(key)) {
    return t(key)
  }
  const altClean = clean.replace(/bussines/g, 'business').replace(/bussiness/g, 'business')
  const altKey = `business.names.${altClean}`
  if (te && t && te(altKey)) {
    return t(altKey)
  }
  return rawName.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}

export function translateError(err: any, t?: (key: string, values?: any) => string): string {
  const str = err?.response?.data?.message || err?.response?.data || err?.message
  const lower = typeof str === 'string' ? str.toLowerCase() : ''

  if (!t) return str || 'Operation error'

  const levelMatch = lower.match(/level\s+(\d+)/) || lower.match(/рівень\s+(\d+)/) || lower.match(/уровень\s+(\d+)/)
  if (levelMatch) {
    return t('business.requires_level', { level: levelMatch[1] })
  }
  if (lower.includes('requires level') || lower.includes('потрібен рівень') || lower.includes('требуется уровень')) {
    const match = lower.match(/\d+/)
    return t('business.requires_level', { level: match ? match[0] : '' })
  }
  if (lower.includes('premium') || lower.includes('преміум')) {
    return t('business.requires_premium')
  }
  if (lower.includes('not enough money') || lower.includes('no money') || lower.includes('недостатньо монет') || lower.includes('недостаточно монет')) {
    return t('business.not_enough_money')
  }
  if (lower.includes('not enough water') || lower.includes('no water') || lower.includes('недостатньо води') || lower.includes('недостаточно воды')) {
    return t('business.not_enough_water')
  }
  if (lower.includes('cannot be watered') || lower.includes('не можна поливати') || lower.includes('нельзя поливать')) {
    return t('business.cannot_be_watered')
  }
  if (lower.includes('wait') || lower.includes('зачекайте') || lower.includes('подождите')) {
    return t('clicker.daily_limit_reached')
  }
  if (lower.includes('not found') || lower.includes('не знайдено') || lower.includes('не найден')) {
    return t('business.not_found')
  }
  return str || t('business.operation_error')
}

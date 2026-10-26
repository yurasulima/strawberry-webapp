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

  const levelMatch = lower.match(/level\s+(\d+)/)
  if (levelMatch) {
    return t('business.requires_level', { level: levelMatch[1] })
  }
  if (lower.includes('requires level')) {
    const match = lower.match(/\d+/)
    return t('business.requires_level', { level: match ? match[0] : '' })
  }
  if (lower.includes('premium')) {
    return t('business.requires_premium')
  }
  if (lower.includes('not enough money') || lower.includes('no money')) {
    return t('business.not_enough_money')
  }
  if (lower.includes('not found')) {
    return t('business.not_found')
  }
  return str || t('business.operation_error')
}

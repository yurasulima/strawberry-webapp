#!/usr/bin/env node
/**
 * Одноразова міграція контенту в БД через адмін-API нового бекенду:
 *   • предмети: назви з locales/*.json + текстури з public/items/*.png
 *   • бізнеси:  назви з locales/*.json (business.names.*)
 *
 *   ADMIN_TOKEN=<jwt адміна> node scripts/migrate-items.mjs \
 *       --api https://sapi.memories-app.org \
 *       [--locales ./src/locales] [--items-dir ./public/items] \
 *       [--only items|businesses] [--dry-run] [--force]
 *
 * Ідемпотентний: за замовчуванням не перезаписує назви й текстури, які вже є в БД
 * (--force — перезаписати). Працює лише з тим, що вже існує в БД; нічого не створює.
 * Потрібен Node 18+ (fetch/FormData/Blob вбудовані).
 */
import { readFile, readdir } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import path from 'node:path'

const LANGS = { uk: 'nameUk', en: 'nameEn', ru: 'nameRu' }

function parseArgs(argv) {
  const out = { api: '', locales: './src/locales', itemsDir: './public/items', only: null, dryRun: false, force: false }
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    if (a === '--dry-run') out.dryRun = true
    else if (a === '--force') out.force = true
    else if (a === '--api') out.api = argv[++i]
    else if (a === '--locales') out.locales = argv[++i]
    else if (a === '--items-dir') out.itemsDir = argv[++i]
    else if (a === '--only') out.only = argv[++i]
    else if (a === '--help' || a === '-h') out.help = true
    else throw new Error(`Unknown argument: ${a}`)
  }
  if (out.only && !['items', 'businesses'].includes(out.only)) throw new Error('--only must be items or businesses')
  return out
}

const args = parseArgs(process.argv.slice(2))
if (args.help || !args.api) {
  console.log('Usage: ADMIN_TOKEN=... node migrate-items.mjs --api <url> [--locales dir] [--items-dir dir] [--only items|businesses] [--dry-run] [--force]')
  process.exit(args.help ? 0 : 1)
}
const token = "eyJhbGciOiJIUzUxMiJ9.eyJ0ZWxlZ3JhbUlkIjoxODUwNTQzNzQ5LCJpYXQiOjE3OTQ0ODI5MjYsImV4cCI6MTc5NDU2OTMyNn0.VHfwAI8kbZKBzLsoigMp8RYO86fQADRkVMxYDc3ZTUn6QKDlFxwypDHSza0bnQH3sE5KZlnPtLJdSShUUlvGKw"

if (!token) {
  console.error('Set ADMIN_TOKEN env variable (JWT of an admin user).')
  process.exit(1)
}
const api = args.api.replace(/\/+$/, '')

async function call(method, url, body) {
  const headers = { Authorization: `Bearer ${token}` }
  let payload
  if (body instanceof FormData) payload = body
  else if (body !== undefined) {
    headers['Content-Type'] = 'application/json'
    payload = JSON.stringify(body)
  }
  const res = await fetch(`${api}${url}`, { method, headers, body: payload })
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`${method} ${url} -> ${res.status} ${text.slice(0, 300)}`)
  }
  const ct = res.headers.get('content-type') || ''
  return ct.includes('json') ? res.json() : res.text()
}

/**
 * Читає locale-файли. Для предметів пріоритет inventory.items.* (його показував getItemTitle),
 * запасний варіант — верхньорівневий items.*. Для бізнесів — business.names.*.
 * Повертає { items: {key: {nameUk,...}}, businesses: {key: {nameUk,...}} }.
 */
async function loadLocaleNames() {
  const result = { items: {}, businesses: {} }
  const put = (bucket, key, field, value) => {
    if (typeof value === 'string' && value.trim()) (bucket[key] ??= {})[field] = value.trim()
  }
  for (const [lang, field] of Object.entries(LANGS)) {
    const file = path.join(args.locales, `${lang}.json`)
    if (!existsSync(file)) {
      console.warn(`! ${file} not found — skipping ${lang}`)
      continue
    }
    const json = JSON.parse(await readFile(file, 'utf8'))
    const primary = json?.inventory?.items ?? {}
    const secondary = json?.items ?? {}
    for (const key of new Set([...Object.keys(secondary), ...Object.keys(primary)])) {
      put(result.items, key, field, primary[key] ?? secondary[key])
    }
    for (const [key, value] of Object.entries(json?.business?.names ?? {})) {
      put(result.businesses, key, field, value)
    }
  }
  return result
}

/** Назви, яких ще немає в БД (або всі, якщо --force). */
function namesPatch(entity, fromLocale) {
  const patch = {}
  for (const field of Object.values(LANGS)) {
    if (fromLocale?.[field] && (args.force || !entity[field])) patch[field] = fromLocale[field]
  }
  return patch
}

const hasAnyName = e => Boolean(e.nameUk || e.nameEn || e.nameRu)

async function migrateItems(localeItems) {
  const pngFiles = existsSync(args.itemsDir)
    ? new Set((await readdir(args.itemsDir)).filter(f => f.endsWith('.png')).map(f => f.slice(0, -4)))
    : new Set()

  const items = await call('GET', '/admin/items')
  console.log(`══ ITEMS in DB: ${items.length}\n`)
  const stat = { names: 0, icons: 0, noName: [], noPng: [], failed: [] }

  for (const item of items) {
    const key = item.name
    const log = []

    const patch = namesPatch(item, localeItems[key])
    if (Object.keys(patch).length) {
      log.push(`names ${JSON.stringify(patch)}`)
      if (!args.dryRun) {
        try {
          await call('PUT', `/admin/items/${item.id}`, {
            name: item.name,
            sellPrice: item.sellPrice ?? undefined,
            buyPrice: item.buyPrice ?? undefined,
            ...patch,
          })
          stat.names++
        } catch (e) {
          stat.failed.push(`item ${key}: ${e.message}`)
        }
      } else stat.names++
    } else if (!localeItems[key] && !hasAnyName(item)) {
      stat.noName.push(key)
    }

    const hasIcon = item.iconVersion != null
    if (pngFiles.has(key)) {
      if (args.force || !hasIcon) {
        log.push(`icon ${key}.png`)
        if (!args.dryRun) {
          try {
            const buf = await readFile(path.join(args.itemsDir, `${key}.png`))
            const form = new FormData()
            form.append('file', new Blob([buf], { type: 'image/png' }), `${key}.png`)
            await call('POST', `/admin/items/${item.id}/icon`, form)
            stat.icons++
          } catch (e) {
            stat.failed.push(`item ${key} icon: ${e.message}`)
          }
        } else stat.icons++
      }
    } else if (!hasIcon) {
      stat.noPng.push(key)
    }
    console.log(`${log.length ? '+' : '·'} ${key.padEnd(26)} ${log.join(' | ') || 'nothing to do'}`)
  }

  const dbKeys = new Set(items.map(i => i.name))
  console.log('\n── Items summary ──')
  console.log(`names ${args.dryRun ? 'to update' : 'updated'}: ${stat.names}`)
  console.log(`icons ${args.dryRun ? 'to upload' : 'uploaded'}: ${stat.icons}`)
  if (stat.noName.length) console.log(`no name anywhere (humanized key will show): ${stat.noName.join(', ')}`)
  if (stat.noPng.length) console.log(`no texture anywhere (fallback will show): ${stat.noPng.join(', ')}`)
  const orphanLocale = Object.keys(localeItems).filter(k => !dbKeys.has(k))
  const orphanPng = [...pngFiles].filter(k => !dbKeys.has(k))
  if (orphanLocale.length) console.log(`names in locales, item not in DB (ignored): ${orphanLocale.join(', ')}`)
  if (orphanPng.length) console.log(`PNG files, item not in DB (ignored): ${orphanPng.join(', ')}`)
  return stat.failed
}

// У БД/локалях трапляються друкарські варіанти ключа (garden_bussines) — шукаємо і за ними.
function localeKeyCandidates(name) {
  const alt = name.replace(/bussines/g, 'business').replace(/bussiness/g, 'business')
  return [...new Set([name, alt])]
}

async function migrateBusinesses(localeBiz) {
  const businesses = await call('GET', '/admin/businesses')
  console.log(`\n══ BUSINESSES in DB: ${businesses.length}\n`)
  const stat = { names: 0, noName: [], failed: [] }
  const matched = new Set()

  for (const b of businesses) {
    const localeKey = localeKeyCandidates(b.name).find(k => localeBiz[k])
    if (localeKey) matched.add(localeKey)
    const patch = namesPatch(b, localeKey ? localeBiz[localeKey] : undefined)

    if (Object.keys(patch).length) {
      if (!args.dryRun) {
        try {
          // PUT вимагає всі поля бізнесу — повертаємо поточні значення з GET
          await call('PUT', `/admin/businesses/${b.id}`, {
            name: b.name,
            price: b.price,
            yieldCount: b.yieldCount,
            yieldIntervalSeconds: b.yieldIntervalSeconds,
            item: b.item,
            minLevel: b.minLevel,
            premiumOnly: b.premiumOnly,
            waterable: b.waterable,
            ...patch,
          })
          stat.names++
        } catch (e) {
          stat.failed.push(`business ${b.name}: ${e.message}`)
        }
      } else stat.names++
    } else if (!localeKey && !hasAnyName(b)) {
      stat.noName.push(b.name)
    }
    console.log(`${Object.keys(patch).length ? '+' : '·'} ${b.name.padEnd(26)} ${Object.keys(patch).length ? 'names ' + JSON.stringify(patch) : 'nothing to do'}`)
  }

  console.log('\n── Businesses summary ──')
  console.log(`names ${args.dryRun ? 'to update' : 'updated'}: ${stat.names}`)
  if (stat.noName.length) console.log(`no name anywhere (humanized key will show): ${stat.noName.join(', ')}`)
  const orphan = Object.keys(localeBiz).filter(k => !matched.has(k))
  if (orphan.length) console.log(`names in locales, business not in DB (ignored): ${orphan.join(', ')}`)
  return stat.failed
}

async function main() {
  console.log(args.dryRun ? '(dry-run: nothing will be changed)\n' : '')
  const locale = await loadLocaleNames()
  const failed = []
  if (args.only !== 'businesses') failed.push(...(await migrateItems(locale.items)))
  if (args.only !== 'items') failed.push(...(await migrateBusinesses(locale.businesses)))

  if (failed.length) {
    console.log(`\nFAILED (${failed.length}):`)
    failed.forEach(f => console.log('  - ' + f))
    process.exit(2)
  }
}

main().catch(e => {
  console.error(e.message)
  process.exit(1)
})

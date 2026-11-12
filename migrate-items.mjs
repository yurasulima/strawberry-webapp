#!/usr/bin/env node
/**
 * Одноразова міграція: переносить назви з locales/*.json і текстури з public/items/*.png
 * у БД через адмін-API нового бекенду.
 *
 *   ADMIN_TOKEN=<jwt адміна> node scripts/migrate-items.mjs \
 *       --api https://sapi.memories-app.org \
 *       --locales ./src/locales \
 *       --items-dir ./public/items \
 *       [--dry-run] [--force]
 *
 * Скрипт ідемпотентний: за замовчуванням не перезаписує назви й текстури, які вже є в БД
 * (--force — перезаписати). Працює лише з предметами, що вже існують у БД; нічого не створює.
 * Потрібен Node 18+ (fetch/FormData/Blob вбудовані).
 */
import { readFile, readdir } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import path from 'node:path'

const LANGS = { uk: 'nameUk', en: 'nameEn', ru: 'nameRu' }

function parseArgs(argv) {
  const out = { api: '', locales: './src/locales', itemsDir: './public/items', dryRun: false, force: false }
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    if (a === '--dry-run') out.dryRun = true
    else if (a === '--force') out.force = true
    else if (a === '--api') out.api = argv[++i]
    else if (a === '--locales') out.locales = argv[++i]
    else if (a === '--items-dir') out.itemsDir = argv[++i]
    else if (a === '--help' || a === '-h') out.help = true
    else throw new Error(`Unknown argument: ${a}`)
  }
  return out
}

const args = parseArgs(process.argv.slice(2))
if (args.help || !args.api) {
  console.log('Usage: ADMIN_TOKEN=... node migrate-items.mjs --api <url> [--locales dir] [--items-dir dir] [--dry-run] [--force]')
  process.exit(args.help ? 0 : 1)
}
const token = "eyJhbGciOiJIUzUxMiJ9.eyJ0ZWxlZ3JhbUlkIjoxODUwNTQzNzQ5LCJpYXQiOjE3OTQzNTI4MjQsImV4cCI6MTc5NDQzOTIyNH0.FinXDTVkItSKWDe0NUoON5znO4qbZCBEnNauula08I4XvGyi1V2fRNdyLBJeeq0zDBmJk5qbdzOPY3dnECYdDQ"
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

// Назви зі старого фронтенду: пріоритет inventory.items.* (саме його показував getItemTitle),
// запасний варіант — верхньорівневий items.*.
async function loadLocaleNames() {
  const result = {} // { itemKey: { nameUk, nameEn, nameRu } }
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
      const value = primary[key] ?? secondary[key]
      if (typeof value === 'string' && value.trim()) {
        ;(result[key] ??= {})[field] = value.trim()
      }
    }
  }
  return result
}

async function main() {
  const localeNames = await loadLocaleNames()
  const pngFiles = existsSync(args.itemsDir)
    ? new Set((await readdir(args.itemsDir)).filter(f => f.endsWith('.png')).map(f => f.slice(0, -4)))
    : new Set()

  const items = await call('GET', '/admin/items')
  console.log(`DB items: ${items.length}${args.dryRun ? '  (dry-run: nothing will be changed)' : ''}\n`)

  const stat = { namesUpdated: 0, iconsUploaded: 0, noLocale: [], noPng: [], failed: [] }

  for (const item of items) {
    const key = item.name
    const log = []

    // 1) назви
    const fromLocale = localeNames[key] ?? {}
    const patch = {}
    for (const field of Object.values(LANGS)) {
      if (fromLocale[field] && (args.force || !item[field])) patch[field] = fromLocale[field]
    }
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
          stat.namesUpdated++
        } catch (e) {
          stat.failed.push(`${key}: ${e.message}`)
        }
      } else stat.namesUpdated++
    } else if (!Object.keys(fromLocale).length && !item.nameUk && !item.nameEn && !item.nameRu) {
      stat.noLocale.push(key)
    }

    // 2) текстура
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
            stat.iconsUploaded++
          } catch (e) {
            stat.failed.push(`${key} icon: ${e.message}`)
          }
        } else stat.iconsUploaded++
      }
    } else if (!hasIcon) {
      stat.noPng.push(key)
    }

    console.log(`${log.length ? '+' : '·'} ${key.padEnd(24)} ${log.join(' | ') || 'nothing to do'}`)
  }

  const dbKeys = new Set(items.map(i => i.name))
  const orphanLocale = Object.keys(localeNames).filter(k => !dbKeys.has(k))
  const orphanPng = [...pngFiles].filter(k => !dbKeys.has(k))

  console.log('\n──────── Summary ────────')
  console.log(`names ${args.dryRun ? 'to update' : 'updated'}: ${stat.namesUpdated}`)
  console.log(`icons ${args.dryRun ? 'to upload' : 'uploaded'}: ${stat.iconsUploaded}`)
  if (stat.noLocale.length) console.log(`no name anywhere (will show humanized key): ${stat.noLocale.join(', ')}`)
  if (stat.noPng.length) console.log(`no texture anywhere (will show fallback): ${stat.noPng.join(', ')}`)
  if (orphanLocale.length) console.log(`names in locales but item not in DB (ignored): ${orphanLocale.join(', ')}`)
  if (orphanPng.length) console.log(`PNG files but item not in DB (ignored): ${orphanPng.join(', ')}`)
  if (stat.failed.length) {
    console.log(`\nFAILED (${stat.failed.length}):`)
    stat.failed.forEach(f => console.log('  - ' + f))
    process.exit(2)
  }
}

main().catch(e => {
  console.error(e.message)
  process.exit(1)
})

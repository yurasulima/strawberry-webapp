#!/usr/bin/env node
/**
 * Тест: створити кастомне емодзі Telegram з PNG і отримати його custom_emoji_id.
 *
 *   npm i -D sharp                       # один раз, у проєкті
 *   BOT_TOKEN=<токен бота> node scripts/emoji-test.mjs \
 *       --png ./public/items/strawberry.png \
 *       --owner <telegram user id власника набору> \
 *       [--set items] [--emoji 🍓] [--keyword strawberry] \
 *       [--chat <chat id>]   # надіслати тестове повідомлення з цим емодзі
 *       [--delete]           # після тесту видалити стікер із набору
 *       [--dry]              # лише масштабувати й зберегти emoji-preview.png
 *
 * Токен береться ТІЛЬКИ зі змінної оточення BOT_TOKEN (у історію команд він не потрапляє, у вивід не друкується).
 * Власник (--owner) — користувач, який уже запускав бота (/start).
 */
import { readFile, writeFile } from 'node:fs/promises'
import { parseArgs } from 'node:util'
import sharp from 'sharp'

const { values: a } = parseArgs({
  options: {
    png: { type: 'string' },
    owner: { type: 'string' },
    set: { type: 'string', default: 'items' },
    emoji: { type: 'string', default: '🍓' },
    keyword: { type: 'string' },
    chat: { type: 'string' },
    delete: { type: 'boolean', default: false },
    dry: { type: 'boolean', default: false },
  },
})

const TOKEN = "7767941756:AAEFQkCn1Md2Iyh7zGJb3C3oIH6GTPgLnZs"
const API = 'https://api.telegram.org'
const SIZE = 100 // кастомні емодзі: рівно 100×100 px

if (!a.png || (!a.dry && (!a.owner || !TOKEN))) {
  console.error('Usage: BOT_TOKEN=... node emoji-test.mjs --png <file> --owner <user id> [--set items] [--emoji 🍓] [--chat id] [--delete] [--dry]')
  process.exit(1)
}

/** Піксель-арт: ціле збільшення nearest-neighbor і центрування на прозорому полотні 100×100. */
async function toEmojiPng(file) {
  const src = await readFile(file)
  const { width, height } = await sharp(src).metadata()
  const longest = Math.max(width, height)

  let scaled
  if (longest > SIZE) {
    scaled = await sharp(src).resize(SIZE, SIZE, { fit: 'inside' }).png().toBuffer()
  } else {
    const k = Math.floor(SIZE / longest)
    scaled = await sharp(src).resize(width * k, height * k, { kernel: 'nearest' }).png().toBuffer()
  }
  return sharp({ create: { width: SIZE, height: SIZE, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite([{ input: scaled, gravity: 'center' }])
    .png()
    .toBuffer()
}

function redact(text) {
  return TOKEN ? String(text).split(TOKEN).join('<token>') : String(text)
}


async function tg(method, fields = {}, png) {
  const url = `${API}/bot${TOKEN}/${method}`

  let res

  try {
    if (Object.keys(fields).length === 0 && !png) {
      res = await fetch(url)
    } else {
      const form = new FormData()

      for (const [k, v] of Object.entries(fields)) {
        form.append(
            k,
            typeof v === 'string'
                ? v
                : typeof v === 'number'
                    ? String(v)
                    : JSON.stringify(v)
        )
      }

      if (png) {
        form.append(
            'file0',
            new Blob([png], { type: 'image/png' }),
            'emoji.png'
        )
      }

      res = await fetch(url, {
        method: 'POST',
        body: form
      })
    }
  } catch (e) {
    throw new Error(
        `${method}: network error: ${redact(e.cause?.message || e.message)}`
    )
  }

  const body = await res.text()

  let json

  try {
    json = JSON.parse(body)
  } catch {
    throw new Error(`${method}: HTTP ${res.status}: ${body}`)
  }

  if (!res.ok || !json.ok) {
    throw new Error(
        `${method}: ${json.error_code ?? res.status} ${json.description ?? body}`
    )
  }

  return json.result
}


async function main() {

  console.log('Token configured:', Boolean(TOKEN))

  const response = await fetch(`${API}/bot${TOKEN}/getMe`)
  const body = await response.text()

  console.log('HTTP status:', response.status)
  console.log('Telegram response:', body)


  const png = await toEmojiPng(a.png)
  if (a.dry) {
    await writeFile('emoji-preview.png', png)
    console.log(`Saved emoji-preview.png (${png.length} bytes, ${SIZE}x${SIZE}). Nothing sent to Telegram.`)
    return
  }

  const me = await tg('getMe')
  const setName = `${a.set}_by_${me.username}`
  console.log(`Bot: @${me.username}   set: ${setName}`)

  let existing = null
  try {
    existing = await tg('getStickerSet', { name: setName })
  } catch (e) {
    if (!/STICKERSET_INVALID/i.test(e.message)) throw e
  }

  const sticker = {
    sticker: 'attach://file0',
    format: 'static',
    emoji_list: [a.emoji],
    keywords: [a.keyword || a.png.split(/[\\/]/).pop().replace(/\.png$/i, '')],
  }

  if (!existing) {
    console.log('Set does not exist → createNewStickerSet')
    await tg('createNewStickerSet', {
      user_id: a.owner,
      name: setName,
      title: 'Strawberry items',
      sticker_type: 'custom_emoji',
      stickers: [sticker],
    }, png)
  } else {
    console.log(`Set exists (${existing.stickers.length} stickers) → addStickerToSet`)
    await tg('addStickerToSet', { user_id: a.owner, name: setName, sticker }, png)
  }

  // Новий стікер = той, якого не було до запиту (запасний варіант — останній у наборі).
  const after = await tg('getStickerSet', { name: setName })
  const known = new Set((existing?.stickers ?? []).map(s => s.file_unique_id))
  const added = after.stickers.filter(s => !known.has(s.file_unique_id))
  const created = added.at(-1) ?? after.stickers.at(-1)

  console.log('\n──────── RESULT ────────')
  console.log('custom_emoji_id :', created.custom_emoji_id)
  console.log('emoji (fallback):', created.emoji)
  console.log('file_id         :', created.file_id)
  console.log('set link        : https://t.me/addemoji/' + setName)
  console.log('HTML for bot    :', `<tg-emoji emoji-id="${created.custom_emoji_id}">${a.emoji}</tg-emoji>`)

  if (a.chat) {
    const msg = await tg('sendMessage', {
      chat_id: a.chat,
      parse_mode: 'HTML',
      text: `Test: <tg-emoji emoji-id="${created.custom_emoji_id}">${a.emoji}</tg-emoji> custom emoji`,
    })
    const custom = (msg.entities ?? []).some(e => e.type === 'custom_emoji')
    console.log(custom
      ? '\nsendMessage: OK, у відповіді є custom_emoji entity — бот може відправляти кастомні емодзі.'
      : '\nsendMessage: надіслано, але custom_emoji entity у відповіді НЕМАЄ — імовірно, у чаті буде лише звичайний емодзі\n' +
        '(Telegram дозволяє кастомні емодзі лише ботам із додатковими юзернеймами з Fragment).')
  }

  if (a.delete) {
    await tg('deleteStickerFromSet', { sticker: created.file_id })
    console.log('\nТестовий стікер видалено з набору.')
  }
}

main().catch(e => {
  console.error('ERROR:', redact(e.message))
  process.exit(1)
})

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  normalizeMessageContent,
  getContentType,
  downloadContentFromMessage
} from 'baileys'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const databasePath = path.join(__dirname, 'data', 'rstc.json')
const FOOTER = '> *_Powered By Kanshixi_*'

function readDatabase() {
  fs.mkdirSync(path.dirname(databasePath), { recursive: true })

  if (!fs.existsSync(databasePath)) {
    fs.writeFileSync(databasePath, JSON.stringify({ stickers: {} }, null, 2))
  }

  try {
    const data = JSON.parse(fs.readFileSync(databasePath, 'utf8'))
    if (!data.stickers || typeof data.stickers !== 'object') {
      data.stickers = {}
    }
    return data
  } catch {
    throw new Error('Database RSTC rusak.')
  }
}

function saveDatabase(data) {
  fs.mkdirSync(path.dirname(databasePath), { recursive: true })
  const temporary = `${databasePath}.tmp`
  fs.writeFileSync(temporary, JSON.stringify(data, null, 2))
  fs.renameSync(temporary, databasePath)
}

function toBase64(value) {
  if (value == null) return ''
  if (typeof value === 'string') return value
  return Buffer.from(value).toString('base64')
}

function fromBase64(value) {
  return value ? Buffer.from(value, 'base64') : undefined
}

function unwrap(message) {
  let content = message?.message || message || {}

  for (let i = 0; i < 5; i++) {
    const normalized = normalizeMessageContent(content)
    if (!normalized || normalized === content) break
    content = normalized
  }

  return content
}

function getContextInfo(message) {
  const content = unwrap(message)
  const type = getContentType(content)
  return content?.[type]?.contextInfo
}

function getQuotedSticker(message) {
  const contextInfo = getContextInfo(message)
  const quoted = unwrap({
    message: contextInfo?.quotedMessage
  })

  if (getContentType(quoted) !== 'stickerMessage') return null

  return quoted.stickerMessage
}

function getQuotedMessage(message, jid) {
  const contextInfo = getContextInfo(message)

  if (!contextInfo?.quotedMessage || !contextInfo?.stanzaId) {
    return null
  }

  return {
    key: {
      remoteJid: jid,
      id: contextInfo.stanzaId,
      participant: contextInfo.participant,
      fromMe: false
    },
    message: contextInfo.quotedMessage
  }
}

function serializeSticker(sticker) {
  const required = [
    'url',
    'directPath',
    'fileSha256',
    'fileEncSha256',
    'mediaKey'
  ]

  for (const key of required) {
    if (!sticker[key]) {
      throw new Error(`Metadata sticker tidak lengkap: ${key}`)
    }
  }

  const data = {
    url: sticker.url,
    directPath: sticker.directPath,
    fileSha256: toBase64(sticker.fileSha256),
    fileEncSha256: toBase64(sticker.fileEncSha256),
    mediaKey: toBase64(sticker.mediaKey),
    mimetype: sticker.mimetype || 'image/webp',
    height: sticker.height ?? null,
    width: sticker.width ?? null,
    fileLength: String(sticker.fileLength || 0),
    mediaKeyTimestamp: String(
      sticker.mediaKeyTimestamp || Math.floor(Date.now() / 1000)
    ),
    isAnimated: Boolean(sticker.isAnimated),
    isAvatar: Boolean(sticker.isAvatar),
    isAiSticker: Boolean(sticker.isAiSticker),
    isLottie: Boolean(sticker.isLottie)
  }

  if (sticker.firstFrameLength != null) {
    data.firstFrameLength = sticker.firstFrameLength
  }

  if (sticker.firstFrameSidecar) {
    data.firstFrameSidecar = toBase64(sticker.firstFrameSidecar)
  }

  return data
}

function restoreSticker(sticker) {
  return {
    ...sticker,
    fileSha256: fromBase64(sticker.fileSha256),
    fileEncSha256: fromBase64(sticker.fileEncSha256),
    mediaKey: fromBase64(sticker.mediaKey),
    firstFrameSidecar: fromBase64(sticker.firstFrameSidecar),
    fileLength: Number(sticker.fileLength || 0),
    mediaKeyTimestamp: Number(sticker.mediaKeyTimestamp || 0)
  }
}

async function downloadSticker(sticker) {
  const stream = await downloadContentFromMessage(
    restoreSticker(sticker),
    'sticker'
  )

  const chunks = []

  for await (const chunk of stream) {
    chunks.push(chunk)
  }

  return Buffer.concat(chunks)
}

function cleanCategory(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, '')
    .slice(0, 32)
}

function formatCategory(name, group) {
  return `${group.emoji || '📁'} ${name} (${group.items?.length || 0})`
}

export default {
  command: ['rstc', 'stickerdb'],
  description: 'Sticker collection dan manual sticker reaction',

  async run(ctx) {
    const [action = 'help', rawCategory = '', rawValue = ''] = ctx.args
    const category = cleanCategory(rawCategory)
    const data = readDatabase()

    if (action === 'add') {
      if (!ctx.isOwner) {
        return ctx.reply(`Perintah ini hanya untuk owner.\n\n${FOOTER}`)
      }

      if (!category) {
        return ctx.reply(
          `Format: ${ctx.prefix}rstc add <kategori> <emoji>\nReply sticker yang ingin disimpan.\n\n${FOOTER}`
        )
      }

      const sticker = getQuotedSticker(ctx.message)

      if (!sticker) {
        return ctx.reply(
          `Reply sebuah sticker untuk menyimpannya.\n\n${FOOTER}`
        )
      }

      const emoji = rawValue || data.stickers[category]?.emoji || ''

      if (!data.stickers[category] && !emoji) {
        return ctx.reply(
          `Kategori ${category} belum ada. Sertakan emoji.\nContoh: ${ctx.prefix}rstc add ${category} 😴\n\n${FOOTER}`
        )
      }

      try {
        const savedSticker = serializeSticker(sticker)
        const group = data.stickers[category] ||= {
          emoji,
          items: []
        }

        if (emoji) group.emoji = emoji
        if (!Array.isArray(group.items)) group.items = []

        group.items.push(savedSticker)
        saveDatabase(data)

        return ctx.reply(
          `Sticker berhasil disimpan!\nKategori: ${category}\nEmoji: ${group.emoji}\nTotal: ${group.items.length}\n\n${FOOTER}`
        )
      } catch (error) {
        return ctx.reply(
          `Gagal menyimpan sticker: ${error.message}\n\n${FOOTER}`
        )
      }
    }

    if (action === 'list' || action === 'ls') {
      const entries = Object.entries(data.stickers)
        .filter(([, group]) => Array.isArray(group?.items) && group.items.length)

      if (!entries.length) {
        return ctx.reply(
          `Belum ada koleksi sticker tersimpan.\n\n${FOOTER}`
        )
      }

      const lines = entries.map(([name, group], index) =>
        `${index + 1}. ${formatCategory(name, group)}`
      )

      return ctx.reply(
        `╭━━〔 STICKER COLLECTION 〕━━╮\n${lines.join('\n')}\n╰━━━━━━━━━━━━━━━━━━━━━━╯\n\nGunakan:\n${ctx.prefix}rstc get <kategori>\n${ctx.prefix}rstc react <kategori>\n\n${FOOTER}`
      )
    }

    if (action === 'get' || action === 'send') {
      if (!category) {
        return ctx.reply(
          `Format: ${ctx.prefix}rstc get <kategori> [nomor]\n\n${FOOTER}`
        )
      }

      const group = data.stickers[category]

      if (!group?.items?.length) {
        return ctx.reply(
          `Kategori ${category} tidak ditemukan atau kosong.\n\n${FOOTER}`
        )
      }

      const index = rawValue
        ? Number(rawValue) - 1
        : Math.floor(Math.random() * group.items.length)

      if (!Number.isInteger(index) || index < 0 || index >= group.items.length) {
        return ctx.reply(
          `Nomor sticker tidak valid. Total: ${group.items.length}\n\n${FOOTER}`
        )
      }

      try {
        const buffer = await downloadSticker(group.items[index])

        await ctx.sock.sendMessage(
          ctx.jid,
          { sticker: buffer }
        )

        return ctx.reply(
          `${group.emoji || '📁'} ${category} • ${index + 1}/${group.items.length}\n\n${FOOTER}`
        )
      } catch (error) {
        return ctx.reply(
          `Gagal mengambil sticker: ${error.message}\n\n${FOOTER}`
        )
      }
    }

    if (action === 'react') {
      if (!category) {
        return ctx.reply(
          `Format: ${ctx.prefix}rstc react <kategori> [nomor]\nReply pesan yang ingin diberi sticker.\n\n${FOOTER}`
        )
      }

      const quoted = getQuotedMessage(ctx.message, ctx.jid)

      if (!quoted) {
        return ctx.reply(
          `Reply pesan yang ingin diberi sticker reaction.\n\n${FOOTER}`
        )
      }

      const group = data.stickers[category]

      if (!group?.items?.length) {
        return ctx.reply(
          `Kategori ${category} tidak ditemukan atau kosong.\n\n${FOOTER}`
        )
      }

      const index = rawValue
        ? Number(rawValue) - 1
        : Math.floor(Math.random() * group.items.length)

      if (!Number.isInteger(index) || index < 0 || index >= group.items.length) {
        return ctx.reply(
          `Nomor sticker tidak valid. Total: ${group.items.length}\n\n${FOOTER}`
        )
      }

      try {
        const buffer = await downloadSticker(group.items[index])

        await ctx.sock.sendMessage(
          ctx.jid,
          { sticker: buffer },
          { quoted }
        )

      } catch (error) {
        return ctx.reply(
          `Gagal mengirim sticker reaction: ${error.message}\n\n${FOOTER}`
        )
      }
    }

    if (action === 'del' || action === 'delete' || action === 'remove') {
      if (!ctx.isOwner) {
        return ctx.reply(`Perintah ini hanya untuk owner.\n\n${FOOTER}`)
      }

      if (!category) {
        return ctx.reply(
          `Format: ${ctx.prefix}rstc del <kategori> [nomor]\n\n${FOOTER}`
        )
      }

      const group = data.stickers[category]

      if (!group?.items?.length) {
        return ctx.reply(
          `Kategori ${category} tidak ditemukan.\n\n${FOOTER}`
        )
      }

      if (!rawValue) {
        delete data.stickers[category]
        saveDatabase(data)

        return ctx.reply(
          `Kategori ${category} berhasil dihapus.\n\n${FOOTER}`
        )
      }

      const index = Number(rawValue) - 1

      if (!Number.isInteger(index) || index < 0 || index >= group.items.length) {
        return ctx.reply(
          `Nomor sticker tidak valid. Total: ${group.items.length}\n\n${FOOTER}`
        )
      }

      group.items.splice(index, 1)

      if (!group.items.length) {
        delete data.stickers[category]
      }

      saveDatabase(data)

      return ctx.reply(
        `Sticker nomor ${index + 1} dari ${category} berhasil dihapus.\n\n${FOOTER}`
      )
    }

    if (action === 'help') {
      return ctx.reply([
        '╭━━〔 RSTC STICKER DATABASE 〕━━╮',
        '',
        `${ctx.prefix}rstc add <kategori> <emoji>`,
        'Reply sticker untuk menyimpannya (owner).',
        '',
        `${ctx.prefix}rstc list`,
        'Lihat semua kategori sticker.',
        '',
        `${ctx.prefix}rstc get <kategori> [nomor]`,
        'Kirim sticker biasa.',
        '',
        `${ctx.prefix}rstc react <kategori> [nomor]`,
        'Reply pesan untuk mengirim sticker sebagai balasan.',
        '',
        `${ctx.prefix}rstc del <kategori> [nomor]`,
        'Hapus kategori atau sticker (owner).',
        '',
        '╰━━━━━━━━━━━━━━━━━━━━━━━━━━╯',
        '',
        FOOTER
      ].join('\n'))
    }

    return ctx.reply(
      `Subcommand tidak dikenal. Ketik ${ctx.prefix}rstc help\n\n${FOOTER}`
    )
  }
}
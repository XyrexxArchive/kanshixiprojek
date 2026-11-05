import { downloadMediaMessage, getContentType } from 'baileys'
import { fileTypeFromBuffer } from 'file-type'
import { unwrapMessage, getQuotedMessage } from '../../lib/function.js'
import { uploadFile, uploadImage } from '../../scrape/top4top.js'

const MAX_SIZE = 50 * 1024 * 1024

const MEDIA_TYPES = new Set([
  'imageMessage',
  'videoMessage',
  'audioMessage',
  'documentMessage',
  'stickerMessage'
])

function getMediaSource(ctx) {
  const ownContent = unwrapMessage(ctx.message)
  const ownType = getContentType(ownContent)

  if (MEDIA_TYPES.has(ownType)) return ctx.message

  const contextInfo = getQuotedMessage(ctx.message)
  const quotedMessage = contextInfo.quotedMessage

  if (!quotedMessage) return null

  const quotedContent = unwrapMessage(quotedMessage)
  const quotedType = getContentType(quotedContent)

  if (!MEDIA_TYPES.has(quotedType)) return null

  return {
    key: {
      remoteJid: ctx.jid,
      id: contextInfo.stanzaId,
      participant: contextInfo.participant || ctx.sender,
      fromMe: false
    },
    message: quotedMessage
  }
}

function formatSize(bytes) {
  if (bytes < 1024) return `${bytes} B`

  const units = ['KB', 'MB', 'GB']
  let size = bytes / 1024
  let index = 0

  while (size >= 1024 && index < units.length - 1) {
    size /= 1024
    index++
  }

  return `${size.toFixed(2)} ${units[index]}`
}

export default {
  command: ['tourl'],
  description: 'Upload media ke Top4Top',

  async run(ctx) {
    const mediaMessage = getMediaSource(ctx)

    if (!mediaMessage) {
      return ctx.reply(
        `Reply atau kirim media dengan caption ${ctx.prefix}tourl`
      )
    }

    try {
      await ctx.react('⏳')

      const buffer = await downloadMediaMessage(
        mediaMessage,
        'buffer',
        {},
        {
          reuploadRequest: message =>
            ctx.sock.updateMediaMessage(message)
        }
      )

      if (!Buffer.isBuffer(buffer) || !buffer.length) {
        throw new Error('Gagal mengambil buffer media.')
      }

      if (buffer.length > MAX_SIZE) {
        throw new Error('Ukuran file maksimal 50 MB.')
      }

      const type = await fileTypeFromBuffer(buffer)
      const mime = type?.mime || 'application/octet-stream'

      const result = mime.startsWith('image/')
        ? await uploadImage(buffer)
        : await uploadFile(buffer)

      await ctx.reply([
        '*TOP4TOP UPLOAD SUCCESS*',
        '',
        `• File: ${result.filename}`,
        `• Type: ${result.mimetype}`,
        `• Size: ${formatSize(result.size)}`,
        `• Host: ${result.host}`,
        '',
        '*URL:*',
        result.url
      ].join('\n'))

      await ctx.react('✅')
    } catch (error) {
      await ctx.react('❌').catch(() => {})
      await ctx.reply(`Upload gagal: ${error.message || error}`)
    }
  }
}
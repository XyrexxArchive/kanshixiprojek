
import { generateWAMessageFromContent } from 'baileys'

function extractChannel(input) {
  const value = String(input || '').trim()
  if (!value) return null

  const jid = value.match(/^(\d+@newsletter)$/i)
  if (jid) return { type: 'jid', key: jid[1] }

  const link = value.match(
    /(?:https?:\/\/)?(?:www\.)?whatsapp\.com\/channel\/([a-zA-Z0-9_-]+)/i
  )

  if (link) return { type: 'invite', key: link[1] }

  if (/^[a-zA-Z0-9_-]{10,}$/.test(value)) {
    return { type: 'invite', key: value }
  }

  return null
}

function formatNumber(value) {
  if (value === undefined || value === null || value === '') {
    return 'Tidak diketahui'
  }

  const number = Number(value)

  return Number.isFinite(number)
    ? number.toLocaleString('id-ID')
    : String(value)
}

function formatDate(value) {
  if (!value) return 'Tidak diketahui'

  const numeric = Number(value)
  const date = new Date(numeric < 1e12 ? numeric * 1000 : numeric)

  if (Number.isNaN(date.getTime())) {
    return 'Tidak diketahui'
  }

  return date.toLocaleString('id-ID', {
    timeZone: 'Asia/Jakarta'
  })
}

function stringify(value) {
  if (value === undefined || value === null) {
    return 'Tidak diketahui'
  }

  if (typeof value === 'string') return value

  try {
    return JSON.stringify(value)
  } catch {
    return String(value)
  }
}

async function sendCopyId(ctx, text, id) {
  const jid = ctx.jid
  const sock = ctx.sock

  const content = {
    viewOnceMessage: {
      message: {
        interactiveMessage: {
          body: {
            text
          },
          footer: {
            text: 'Kanshiki • WhatsApp Channel Checker'
          },
          nativeFlowMessage: {
            buttons: [
              {
                name: 'cta_copy',
                buttonParamsJson: JSON.stringify({
                  display_text: 'Copy ID Channel',
                  copy_code: id
                })
              }
            ]
          }
        }
      }
    }
  }

  const generated = generateWAMessageFromContent(
    jid,
    content,
    {
      userJid: sock.user?.id
    }
  )

  await sock.relayMessage(
    jid,
    generated.message,
    {
      messageId: generated.key.id
    }
  )
}

export default {
  command: ['cekidch', 'idch'],
  description: 'Mengecek metadata WhatsApp Channel',

  async run(ctx) {
    const input = ctx.args.join(' ').trim()

    if (!input) {
      return ctx.reply(
        `*CEK ID CHANNEL*

Contoh:

${ctx.prefix}cekidch https://whatsapp.com/channel/xxxx`
      )
    }

    const channel = extractChannel(input)

    if (!channel) {
      return ctx.reply('❌ Link atau ID WhatsApp Channel tidak valid.')
    }

    const sock = ctx.sock

    if (typeof sock.newsletterMetadata !== 'function') {
      return ctx.reply(
        '❌ newsletterMetadata() tidak tersedia di Baileys ini.'
      )
    }

    await ctx.reply('⏳ Mengambil metadata WhatsApp Channel...')

    try {
      const metadata = await sock.newsletterMetadata(
        channel.type,
        channel.key,
        {
          fetchPinnedMessages: true,
          fetchStatusMetadata: true,
          fetchWamoSub: true
        }
      )

      const thread = metadata?.thread_metadata || {}

      const id = metadata?.id || (
        channel.type === 'jid' ? channel.key : null
      )

      if (!id) {
        throw new Error('ID Channel tidak ditemukan pada metadata.')
      }

      const name = thread.name?.text || 'Tidak diketahui'
      const description = thread.description?.text || 'Tidak ada deskripsi'

      const handle = thread.handle
        ? (
            String(thread.handle).startsWith('@')
              ? thread.handle
              : `@${thread.handle}`
          )
        : '-'

      const subscribers = formatNumber(thread.subscribers_count)
      const created = formatDate(thread.creation_time)
      const verification = stringify(thread.verification)
      const reactions = stringify(thread.settings?.reaction_codes?.value)

      const invite = thread.invite ||
        metadata?.invite ||
        (channel.type === 'invite' ? channel.key : null)

      const inviteLink = invite
        ? `https://whatsapp.com/channel/${invite}`
        : 'Tidak tersedia'

      const pinned = Array.isArray(thread.pinned_messages)
        ? thread.pinned_messages.length
        : 0

      const statusMeta = metadata?.status_metadata || {}

      const lastStatusId =
        statusMeta.last_status_server_id ?? 'Tidak tersedia'

      const lastStatusTime = formatDate(
        statusMeta.last_status_sent_time
      )

      const wamo = thread.wamo_sub?.plan_id || 'Tidak tersedia'

      const text = [
        '*WHATSAPP CHANNEL INFO*',
        '',
        `◦ Nama: ${name}`,
        `◦ ID Channel: ${id}`,
        `◦ Handle: ${handle}`,
        `◦ Subscriber: ${subscribers}`,
        `◦ Dibuat: ${created}`,
        `◦ Verifikasi: ${verification}`,
        `◦ Reaksi: ${reactions}`,
        `◦ Pinned Messages: ${pinned}`,
        `◦ WAMO Plan: ${wamo}`,
        '',
        '*STATUS CHANNEL*',
        `◦ Last Status ID: ${lastStatusId}`,
        `◦ Last Status: ${lastStatusTime}`,
        '',
        '*DESKRIPSI*',
        description,
        '',
        '*LINK CHANNEL*',
        inviteLink
      ].join('\n')

      await sendCopyId(ctx, text, id)
    } catch (error) {
      console.error('[CEKIDCH]', error)

      await ctx.reply(
        `❌ Gagal mengambil metadata channel.\n\nAlasan: ${error.message}`
      )
    }
  }
}

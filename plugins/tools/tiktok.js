import tiktok from '../../scrape/tiktok.js'

const CONFIG = {
  maxTimeout: 120000
}

function getDownload(downloads, type) {
  if (type === 'mp3') {
    return downloads.find(item => item.type === 'music')
  }

  if (type === 'mp4') {
    return downloads.find(item => item.type === 'video')
  }

  return null
}

export default {
  command: ['tt', 'tiktok'],
  description: 'Download TikTok MP3 dan MP4',

  async run(ctx) {
    const [format, ...urlParts] = ctx.args
    const type = String(format || '').toLowerCase()
    const url = urlParts.join(' ').trim()

    if (!type || !url) {
      return ctx.reply(
        `*TikTok Downloader*\n\n` +
        `Format penggunaan:\n\n` +
        `• ${ctx.prefix}tt mp3 link\n` +
        `• ${ctx.prefix}tt mp4 link\n\n` +
        `Contoh:\n` +
        `${ctx.prefix}tt mp3 https://vt.tiktok.com/xxxxx\n` +
        `${ctx.prefix}tt mp4 https://vt.tiktok.com/xxxxx`
      )
    }

    if (!['mp3', 'mp4'].includes(type)) {
      return ctx.reply(
        `Format tidak valid!\n\n` +
        `Gunakan:\n` +
        `• ${ctx.prefix}tt mp3 link\n` +
        `• ${ctx.prefix}tt mp4 link`
      )
    }

    try {
      new URL(url.startsWith('http') ? url : `https://${url}`)
    } catch {
      return ctx.reply('URL tidak valid. Masukkan link TikTok yang benar.')
    }

    await ctx.react('⏳')

    try {
      const response = await tiktok.scrape(url)

      if (!response.status) {
        throw new Error(response.message)
      }

      const result = response.result
      const download = getDownload(result.downloads, type)

      if (!download?.url) {
        throw new Error(
          type === 'mp3'
            ? 'Link audio MP3 tidak ditemukan.'
            : 'Link video MP4 tanpa watermark tidak ditemukan.'
        )
      }

      const caption =
        `TikTok Downloader\n\n` +
        `Title: ${result.title}\n` +
        `Author: ${result.author}\n` +
        `Format: ${type.toUpperCase()}\n` +
        `Source: SSSTik`

      if (type === 'mp3') {
        await ctx.sock.sendMessage(
          ctx.jid,
          {
            audio: { url: download.url },
            mimetype: 'audio/mpeg',
            fileName: `${result.title}.mp3`,
            ptt: false
          },
          { quoted: ctx.message }
        )
      } else {
        await ctx.sock.sendMessage(
          ctx.jid,
          {
            video: { url: download.url },
            mimetype: 'video/mp4',
            fileName: `${result.title}.mp4`,
            caption
          },
          { quoted: ctx.message }
        )
      }

      await ctx.react('✅')
    } catch (error) {
      console.error('[TIKTOK]', error)

      await ctx.react('❌').catch(() => {})

      await ctx.reply(
        `TikTok Downloader gagal!\n\n${error.message || 'Unknown error'}`
      )
    }
  }
}
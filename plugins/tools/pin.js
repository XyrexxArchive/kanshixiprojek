import pinterest from '../../scrape/pinterest.js'
import sharp from 'sharp'

const CONFIG = {
  limit: 6,
  timeout: 25000,
  maxImageSize: 15 * 1024 * 1024,
  userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36'
}

async function downloadImage(url) {
  const response = await fetch(url, {
    headers: {
      'user-agent': CONFIG.userAgent,
      accept: 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
      referer: 'https://www.pinterest.com/'
    },
    signal: AbortSignal.timeout(CONFIG.timeout),
    redirect: 'follow'
  })

  if (!response.ok) throw new Error(`Gagal download gambar: HTTP ${response.status}`)

  const contentType = response.headers.get('content-type') || ''
  if (!contentType.toLowerCase().startsWith('image/')) {
    throw new Error(`URL bukan gambar (${contentType || 'content-type tidak diketahui'}).`)
  }

  const declaredSize = Number(response.headers.get('content-length') || 0)
  if (declaredSize > CONFIG.maxImageSize) throw new Error('Gambar melebihi batas 15 MB.')

  const buffer = Buffer.from(await response.arrayBuffer())
  if (!buffer.length) throw new Error('Gambar kosong.')
  if (buffer.length > CONFIG.maxImageSize) throw new Error('Gambar melebihi batas 15 MB.')

  return buffer
}

async function makeBlurPreview(buffer) {
  return sharp(buffer, { failOn: 'none' })
    .rotate()
    .resize({ width: 720, height: 720, fit: 'cover' })
    .blur(28)
    .jpeg({ quality: 45, mozjpeg: true })
    .toBuffer()
}

function uniqueImages(results) {
  const seen = new Set()
  const images = []

  for (const item of results || []) {
    if (item?.video || !item?.image) continue
    if (seen.has(item.image)) continue
    seen.add(item.image)
    images.push(item)
    if (images.length >= CONFIG.limit) break
  }

  return images
}

export default {
  command: ['pin', 'pinterest'],
  description: 'Cari gambar Pinterest dan kirim album maksimal 6 foto',
  owner: false,

  async run(ctx) {
    const query = ctx.args.join(' ').trim()
    if (!query) return ctx.reply(`Contoh: ${ctx.prefix}pin anime wallpaper`)

    let previewSent = false

    try {
      await ctx.react('🔎')
      const results = await pinterest.pinterestSearch(query, CONFIG.limit)
      const images = uniqueImages(results).slice(0, CONFIG.limit)

      if (!images.length) {
        await ctx.react('❌')
        return ctx.reply(`Tidak ada foto Pinterest untuk: ${query}`)
      }

      const firstBuffer = await downloadImage(images[0].image)
      const preview = await makeBlurPreview(firstBuffer)

      await ctx.sock.sendMessage(ctx.jid, {
        image: preview,
        caption: `🔎 Pinterest: ${query}\nMenyiapkan ${images.length} foto...`
      }, { quoted: ctx.message })
      previewSent = true

      const downloaded = await Promise.all([
        Promise.resolve(firstBuffer),
        ...images.slice(1).map(item => downloadImage(item.image))
      ])

      const album = downloaded.map((buffer, index) => ({
        image: buffer,
        caption: index === 0
          ? `Pinterest Search\nQuery: ${query}\nFoto: ${downloaded.length}/${CONFIG.limit}\nSumber: Pinterest`
          : ''
      }))

      if (album.length >= 2) {
        await ctx.sock.sendMessage(ctx.jid, { album }, { quoted: ctx.message })
      } else {
        await ctx.sock.sendMessage(ctx.jid, album[0], { quoted: ctx.message })
      }

      await ctx.react('✅')
    } catch (error) {
      console.error('[PINTEREST]', error)
      await ctx.react('❌').catch(() => {})
      return ctx.reply(`Pinterest gagal diproses.\n${error.message}${previewSent ? '\nPreview blur sudah terkirim; album tidak berhasil diselesaikan.' : ''}`)
    }
  }
}

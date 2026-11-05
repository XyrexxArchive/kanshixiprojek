import path from 'node:path'
import dns from 'node:dns/promises'
import net from 'node:net'

const CONFIG = {
  timeout: 60000,
  maxSize: 64 * 1024 * 1024,
  maxRedirects: 5,
  userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36'
}

const MIME_EXTENSIONS = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
  'image/avif': 'avif',
  'image/bmp': 'bmp',
  'video/mp4': 'mp4',
  'video/webm': 'webm',
  'video/quicktime': 'mov',
  'video/x-matroska': 'mkv',
  'audio/mpeg': 'mp3',
  'audio/mp3': 'mp3',
  'audio/mp4': 'm4a',
  'audio/aac': 'aac',
  'audio/ogg': 'ogg',
  'audio/opus': 'opus',
  'audio/wav': 'wav',
  'audio/webm': 'weba',
  'audio/flac': 'flac',
  'application/pdf': 'pdf',
  'application/zip': 'zip',
  'application/json': 'json',
  'application/octet-stream': 'bin',
  'text/plain': 'txt',
  'text/html': 'html',
  'application/vnd.rar': 'rar',
  'application/x-rar-compressed': 'rar',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'pptx'
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

function safeFilename(name) {
  return String(name || 'download')
    .replace(/[<>:"/\\|?*\x00-\x1F]/g, '_')
    .replace(/^\.+/, '')
    .slice(0, 180) || 'download'
}

function getFilenameFromDisposition(value) {
  if (!value) return null

  const utf8 = value.match(/filename\*=UTF-8''([^;]+)/i)

  if (utf8) {
    try {
      return decodeURIComponent(utf8[1].replace(/["']/g, ''))
    } catch {}
  }

  const normal = value.match(/filename="?([^";]+)"?/i)

  return normal?.[1] || null
}

function isPrivateIPv4(ip) {
  const parts = ip.split('.').map(Number)

  if (parts.length !== 4 || parts.some(n => n < 0 || n > 255)) {
    return true
  }

  const [a, b] = parts

  return (
    a === 0 ||
    a === 10 ||
    a === 127 ||
    a >= 224 ||
    (a === 100 && b >= 64 && b <= 127) ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    (a === 192 && b === 0) ||
    (a === 198 && (b === 18 || b === 19))
  )
}

function isPrivateIPv6(ip) {
  const value = ip.toLowerCase()

  return (
    value === '::' ||
    value === '::1' ||
    value.startsWith('fc') ||
    value.startsWith('fd') ||
    /^fe[89ab]/.test(value) ||
    value.startsWith('::ffff:127.') ||
    value.startsWith('::ffff:10.') ||
    value.startsWith('::ffff:192.168.')
  )
}

async function validateURL(input) {
  let url

  try {
    url = new URL(input)
  } catch {
    throw new Error('URL tidak valid.')
  }

  if (!['http:', 'https:'].includes(url.protocol)) {
    throw new Error('Hanya URL HTTP dan HTTPS yang didukung.')
  }

  if (url.username || url.password) {
    throw new Error('URL dengan username/password tidak diizinkan.')
  }

  const hostname = url.hostname.toLowerCase().replace(/^\[|\]$/g, '')
  const ipType = net.isIP(hostname)

  if (
    hostname === 'localhost' ||
    hostname.endsWith('.localhost') ||
    hostname.endsWith('.local') ||
    hostname === 'metadata.google.internal'
  ) {
    throw new Error('Alamat lokal tidak diizinkan.')
  }

  if (ipType === 4 && isPrivateIPv4(hostname)) {
    throw new Error('IP private tidak diizinkan.')
  }

  if (ipType === 6 && isPrivateIPv6(hostname)) {
    throw new Error('IP private tidak diizinkan.')
  }

  if (!ipType) {
    const records = await dns.lookup(hostname, {
      all: true,
      verbatim: true
    }).catch(() => [])

    if (!records.length) {
      throw new Error('Domain tidak dapat ditemukan.')
    }

    for (const record of records) {
      if (
        (net.isIP(record.address) === 4 && isPrivateIPv4(record.address)) ||
        (net.isIP(record.address) === 6 && isPrivateIPv6(record.address))
      ) {
        throw new Error('Domain mengarah ke alamat IP private.')
      }
    }
  }

  return url
}

async function fetchURL(input) {
  let currentURL = input

  for (let i = 0; i <= CONFIG.maxRedirects; i++) {
    await validateURL(currentURL)

    const controller = new AbortController()
    const timer = setTimeout(
      () => controller.abort(),
      CONFIG.timeout
    )

    let response

    try {
      response = await fetch(currentURL, {
        method: 'GET',
        redirect: 'manual',
        signal: controller.signal,
        headers: {
          'user-agent': CONFIG.userAgent,
          accept: '*/*'
        }
      })
    } catch (error) {
      clearTimeout(timer)

      if (error.name === 'AbortError') {
        throw new Error('Download timeout.')
      }

      throw new Error(`Gagal mengakses URL: ${error.message}`)
    }

    if ([301, 302, 303, 307, 308].includes(response.status)) {
      const location = response.headers.get('location')
      clearTimeout(timer)

      if (!location) {
        throw new Error('Redirect tidak memiliki lokasi tujuan.')
      }

      if (i === CONFIG.maxRedirects) {
        throw new Error('Terlalu banyak redirect.')
      }

      currentURL = new URL(location, currentURL).href
      continue
    }

    if (!response.ok) {
      clearTimeout(timer)
      throw new Error(`HTTP ${response.status} ${response.statusText}`)
    }

    const declaredSize = Number(
      response.headers.get('content-length') || 0
    )

    if (declaredSize > CONFIG.maxSize) {
      clearTimeout(timer)
      throw new Error('Ukuran file melebihi batas 64 MB.')
    }

    const chunks = []
    let totalSize = 0

    try {
      if (!response.body) {
        throw new Error('Response tidak memiliki data.')
      }

      const reader = response.body.getReader()

      while (true) {
        const { done, value } = await reader.read()

        if (done) break

        totalSize += value.byteLength

        if (totalSize > CONFIG.maxSize) {
          await reader.cancel()
          throw new Error('Ukuran file melebihi batas 64 MB.')
        }

        chunks.push(Buffer.from(value))
      }
    } finally {
      clearTimeout(timer)
    }

    const buffer = Buffer.concat(chunks)

    if (!buffer.length) {
      throw new Error('File kosong.')
    }

    return {
      buffer,
      finalURL: currentURL,
      contentType: (
        response.headers.get('content-type') ||
        'application/octet-stream'
      ).split(';')[0].trim().toLowerCase(),
      disposition: response.headers.get('content-disposition')
    }
  }

  throw new Error('Tidak dapat mengikuti redirect.')
}

function detectMime(buffer, fallback) {
  if (
    buffer.length >= 3 &&
    buffer[0] === 0xff &&
    buffer[1] === 0xd8 &&
    buffer[2] === 0xff
  ) return 'image/jpeg'

  if (
    buffer.length >= 8 &&
    buffer.subarray(0, 8).equals(
      Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])
    )
  ) return 'image/png'

  if (buffer.subarray(0, 4).toString() === 'RIFF') {
    const type = buffer.subarray(8, 12).toString()

    if (type === 'WEBP') return 'image/webp'
    if (type === 'WAVE') return 'audio/wav'
  }

  if (buffer.subarray(0, 3).toString() === 'GIF') {
    return 'image/gif'
  }

  if (buffer.subarray(4, 8).toString() === 'ftyp') {
    const brand = buffer.subarray(8, 12).toString()

    if (['isom', 'iso2', 'mp41', 'mp42', 'avc1'].includes(brand)) {
      return 'video/mp4'
    }

    if (brand === 'M4A ') return 'audio/mp4'
    if (brand === 'qt  ') return 'video/quicktime'
  }

  if (buffer.subarray(0, 4).toString() === 'OggS') {
    return 'audio/ogg'
  }

  if (buffer.subarray(0, 4).toString() === 'fLaC') {
    return 'audio/flac'
  }

  if (buffer.subarray(0, 4).toString() === 'PK\u0003\u0004') {
    return 'application/zip'
  }

  if (buffer.subarray(0, 5).toString() === '%PDF-') {
    return 'application/pdf'
  }

  if (buffer.subarray(0, 4).toString() === '\x1aEß£') {
    return 'video/webm'
  }

  return fallback
}

function getCategory(mime) {
  if (mime.startsWith('image/')) return 'photo'
  if (mime.startsWith('video/')) return 'video'
  if (mime.startsWith('audio/')) return 'audio'
  return 'file'
}

function makeFilename(disposition, url, mime) {
  let filename = getFilenameFromDisposition(disposition)

  if (!filename) {
    const parsed = new URL(url)
    filename = path.basename(parsed.pathname)
  }

  if (!filename || filename === '/') {
    filename = `download.${MIME_EXTENSIONS[mime] || 'bin'}`
  }

  filename = safeFilename(filename)

  if (!path.extname(filename)) {
    filename += `.${MIME_EXTENSIONS[mime] || 'bin'}`
  }

  return filename
}

function createResultJSON(data) {
  return JSON.stringify(data, null, 2)
}

async function sendDownload(ctx, buffer, filename, mime, category) {
  const quoted = { quoted: ctx.message }

  const caption = [
    '╭─「 DOWNLOAD SUCCESS 」',
    '│',
    `├─ File: ${filename}`,
    `├─ Type: ${category}`,
    `├─ MIME: ${mime}`,
    `├─ Size: ${formatSize(buffer.length)}`,
    '│',
    '└─ Kanshixi Downloader'
  ].join('\n')

  if (category === 'photo') {
    await ctx.sock.sendMessage(
      ctx.jid,
      {
        image: buffer,
        mimetype: mime,
        caption
      },
      quoted
    )
    return
  }

  if (category === 'video') {
    await ctx.sock.sendMessage(
      ctx.jid,
      {
        video: buffer,
        mimetype: mime,
        fileName: filename,
        caption
      },
      quoted
    )
    return
  }

  if (category === 'audio') {
    await ctx.sock.sendMessage(
      ctx.jid,
      {
        audio: buffer,
        mimetype: mime,
        ptt: false
      },
      quoted
    )

    await ctx.sock.sendMessage(
      ctx.jid,
      {
        text: caption
      },
      quoted
    )
    return
  }

  await ctx.sock.sendMessage(
    ctx.jid,
    {
      document: buffer,
      mimetype: mime,
      fileName: filename,
      caption
    },
    quoted
  )
}

export default {
  command: ['get', 'fetch'],
  description: 'Download foto, video, audio, dan file dari URL',

  async run(ctx) {
    const input = ctx.args.join(' ').trim()

    if (!input) {
      return ctx.reply(
        `╭─「 KANSHIXI GET 」
│
├─ Format:
│ .get URL
│
├─ Support:
│ • Photo
│ • Video
│ • Audio
│ • File / Document
│
├─ Max Size: 64 MB
├─ Timeout: 60 Seconds
│
└─ Contoh:
   .get https://example.com/file.mp4`
      )
    }

    await ctx.react('⏳')

    try {
      const result = await fetchURL(input)

      const mime = detectMime(
        result.buffer,
        result.contentType
      )

      const category = getCategory(mime)

      const filename = makeFilename(
        result.disposition,
        result.finalURL,
        mime
      )

      const jsonData = {
        status: true,
        creator: 'Kanshixi',
        result: {
          url: result.finalURL,
          filename,
          type: category,
          mimetype: mime,
          extension: path.extname(filename).replace('.', ''),
          size: result.buffer.length,
          size_human: formatSize(result.buffer.length),
          downloaded_at: new Date().toISOString()
        }
      }

      const json = createResultJSON(jsonData)

      await ctx.sock.sendMessage(
        ctx.jid,
        {
          text: `╭─「 DOWNLOAD RESULT 」
│
├─ Status: Success
├─ File: ${filename}
├─ Type: ${category}
├─ Size: ${formatSize(result.buffer.length)}
│
├─ JSON Result:
│
\`\`\`json
${json}
\`\`\`
│
└─ Mengirim file...`
        },
        { quoted: ctx.message }
      )

      await sendDownload(
        ctx,
        result.buffer,
        filename,
        mime,
        category
      )

      await ctx.react('✅')
    } catch (error) {
      await ctx.react('❌').catch(() => {})

      await ctx.reply(
        `╭─「 DOWNLOAD FAILED 」
│
├─ Status: Error
│
└─ ${error.message}`
      )
    }
  }
}
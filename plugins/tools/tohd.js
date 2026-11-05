import { downloadMediaMessage, getContentType } from 'baileys'
import sharp from 'sharp'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { tmpdir } from 'node:os'
import path from 'node:path'
import fs from 'node:fs/promises'
import settings from '../../settings.js'
import {
  unwrapMessage,
  getQuotedMessage
} from '../../lib/function.js'

const exec = promisify(execFile)

const CONFIG = {
  maxInputSize: 50 * 1024 * 1024,
  maxOutputSize: 64 * 1024 * 1024,
  maxDimension: 4096,
  upscaleFactor: 2,
  imageQuality: 95,
  videoCRF: 18,
  videoPreset: 'veryfast',
  videoMaxDimension: 1920,
  timeout: 180000
}

function getMediaSource(ctx) {
  const content = unwrapMessage(ctx.message)
  const type = getContentType(content)

  if (['imageMessage', 'videoMessage'].includes(type)) {
    return { message: ctx.message, type }
  }

  const quoted = getQuotedMessage(ctx.message)
  if (!quoted?.quotedMessage) return null

  const quotedContent = unwrapMessage(quoted.quotedMessage)
  const quotedType = getContentType(quotedContent)

  if (!['imageMessage', 'videoMessage'].includes(quotedType)) {
    return null
  }

  return {
    type: quotedType,
    message: {
      key: {
        remoteJid: ctx.jid,
        id: quoted.stanzaId,
        participant: quoted.participant || ctx.sender,
        fromMe: false
      },
      message: quoted.quotedMessage
    }
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

async function downloadMedia(ctx, message) {
  const buffer = await downloadMediaMessage(
    message,
    'buffer',
    {},
    {
      reuploadRequest: msg => ctx.sock.updateMediaMessage(msg)
    }
  )

  if (!Buffer.isBuffer(buffer) || !buffer.length) {
    throw new Error('Gagal mengunduh media WhatsApp.')
  }

  if (buffer.length > CONFIG.maxInputSize) {
    throw new Error(`Ukuran maksimal ${formatSize(CONFIG.maxInputSize)}.`)
  }

  return buffer
}

async function enhanceImage(input) {
  const metadata = await sharp(input, {
    failOn: 'error',
    limitInputPixels: 100000000
  }).metadata()

  if (!metadata.width || !metadata.height) {
    throw new Error('Format gambar tidak valid.')
  }

  if (metadata.pages > 1 || metadata.format === 'gif') {
    throw new Error('Gambar animasi belum didukung.')
  }

  const scale = Math.min(
    CONFIG.upscaleFactor,
    CONFIG.maxDimension / Math.max(metadata.width, metadata.height)
  )

  const width = Math.round(metadata.width * scale)
  const height = Math.round(metadata.height * scale)

  const pipeline = sharp(input)
    .rotate()
    .resize(width, height, {
      fit: 'inside',
      kernel: sharp.kernel.lanczos3
    })
    .normalize()
    .sharpen({
      sigma: 1.1,
      m1: 0.7,
      m2: 2
    })

  const result = await pipeline
    .jpeg({
      quality: CONFIG.imageQuality,
      mozjpeg: true,
      chromaSubsampling: '4:4:4'
    })
    .toBuffer()

  return {
    buffer: result,
    width,
    height,
    mimetype: 'image/jpeg',
    originalWidth: metadata.width,
    originalHeight: metadata.height
  }
}

async function enhanceVideo(input) {
  const dir = await fs.mkdtemp(path.join(tmpdir(), 'kanshixi-hd-'))

  const inputPath = path.join(dir, 'input.mp4')
  const outputPath = path.join(dir, 'output.mp4')

  try {
    await fs.writeFile(inputPath, input)

    const filter = [
      `scale='min(${CONFIG.videoMaxDimension},iw*2)':'min(${CONFIG.videoMaxDimension},ih*2)':force_original_aspect_ratio=decrease:flags=lanczos`,
      'unsharp=5:5:0.8:3:3:0.4',
      'setsar=1'
    ].join(',')

    await exec('ffmpeg', [
      '-y',
      '-i', inputPath,
      '-map', '0:v:0',
      '-map', '0:a?',
      '-vf', filter,
      '-c:v', 'libx264',
      '-preset', CONFIG.videoPreset,
      '-crf', String(CONFIG.videoCRF),
      '-pix_fmt', 'yuv420p',
      '-c:a', 'aac',
      '-b:a', '128k',
      '-movflags', '+faststart',
      '-max_muxing_queue_size', '1024',
      outputPath
    ], {
      timeout: CONFIG.timeout,
      maxBuffer: 10 * 1024 * 1024
    })

    const output = await fs.readFile(outputPath)

    if (!output.length) {
      throw new Error('Hasil video kosong.')
    }

    if (output.length > CONFIG.maxOutputSize) {
      throw new Error(
        `Ukuran hasil terlalu besar: ${formatSize(output.length)}`
      )
    }

    return output
  } finally {
    await fs.rm(dir, {
      recursive: true,
      force: true
    })
  }
}

export default {
  command: ['tohd', 'hdimage'],

  description: 'Enhance gambar dan video menjadi HD',

  async run(ctx) {
    const media = getMediaSource(ctx)

    if (!media) {
      return ctx.reply(
        `Kirim atau reply gambar/video dengan caption ${ctx.prefix}tohd`
      )
    }

    try {
      await ctx.react('⏳')

      const input = await downloadMedia(ctx, media.message)

      if (media.type === 'imageMessage') {
        const result = await enhanceImage(input)

        await ctx.sock.sendMessage(
          ctx.jid,
          {
            image: result.buffer,
            mimetype: result.mimetype,
            caption: [
              '*KANSHIXI IMAGE ENHANCER*',
              '',
              `Resolusi awal: ${result.originalWidth} × ${result.originalHeight}`,
              `Resolusi hasil: ${result.width} × ${result.height}`,
              `Ukuran: ${formatSize(result.buffer.length)}`,
              '',
              settings.footer
            ].join('\n')
          },
          { quoted: ctx.message }
        )
      } else {
        const result = await enhanceVideo(input)

        await ctx.sock.sendMessage(
          ctx.jid,
          {
            video: result,
            mimetype: 'video/mp4',
            caption: [
              '*KANSHIXI VIDEO ENHANCER*',
              '',
              `Ukuran awal: ${formatSize(input.length)}`,
              `Ukuran hasil: ${formatSize(result.length)}`,
              'Codec: H.264',
              'Audio: AAC',
              'Enhancement: Lanczos + Unsharp Mask',
              '',
              settings.footer
            ].join('\n')
          },
          { quoted: ctx.message }
        )
      }

      await ctx.react('✅')
    } catch (error) {
      await ctx.react('❌').catch(() => {})

      await ctx.reply(
        `Gagal memproses media:\n${error.message || error}`
      )
    }
  }
}

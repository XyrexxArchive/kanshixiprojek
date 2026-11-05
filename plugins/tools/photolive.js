import fs from 'node:fs'
import fsp from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { randomUUID } from 'node:crypto'
import { spawn } from 'node:child_process'
import ffmpegStatic from 'ffmpeg-static'

import {
  normalizeMessageContent,
  downloadContentFromMessage,
  prepareWAMessageMedia,
  generateWAMessageFromContent
} from 'baileys'

const CONFIG = {
  maxDuration: 4,
  transition: 0.8,
  freeze: 1.2,
  maxWidth: 1920,
  fps: 30,
  crf: 18,
  preset: 'medium'
}

const FOOTER = '> *_Powered By Kanshixi_*'

function getFFmpegPath() {
  const candidates = [
    ffmpegStatic,
    path.join(process.cwd(), 'node_modules/ffmpeg-static/ffmpeg'),
    '/usr/bin/ffmpeg',
    '/usr/local/bin/ffmpeg'
  ].filter(Boolean)

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) return candidate
  }

  return 'ffmpeg'
}

const ffmpeg = getFFmpegPath()

function execute(command, args, allowError = false) {
  return new Promise((resolve, reject) => {
    const process = spawn(command, args, {
      stdio: ['ignore', 'pipe', 'pipe']
    })

    let stdout = ''
    let stderr = ''

    process.stdout.on('data', data => {
      stdout += data.toString()
    })

    process.stderr.on('data', data => {
      stderr += data.toString()
    })

    process.on('error', reject)

    process.on('close', code => {
      if (code !== 0 && !allowError) {
        return reject(new Error(stderr || `FFmpeg exited with code ${code}`))
      }

      resolve({
        stdout,
        stderr,
        code
      })
    })
  })
}

async function probeDuration(file) {
  const result = await execute(ffmpeg, [
    '-hide_banner',
    '-i',
    file
  ], true)

  const match = result.stderr.match(
    /Duration:\s*(\d{2}):(\d{2}):(\d{2}(?:\.\d+)?)/
  )

  if (!match) {
    throw new Error('Tidak bisa membaca durasi video.')
  }

  const duration =
    Number(match[1]) * 3600 +
    Number(match[2]) * 60 +
    Number(match[3])

  if (!Number.isFinite(duration) || duration <= 0) {
    throw new Error('Durasi video tidak valid.')
  }

  return duration
}

function getContent(message) {
  return normalizeMessageContent(message?.message || message) || {}
}

function getMessageType(message) {
  const content = getContent(message)

  return Object.keys(content).find(key =>
    ['videoMessage', 'imageMessage'].includes(key)
  )
}

function getQuotedMessage(message) {
  const content = getContent(message)

  for (const value of Object.values(content)) {
    const context = value?.contextInfo

    if (context?.quotedMessage) {
      return {
        message: context.quotedMessage,
        context
      }
    }
  }

  return null
}

function getVideoSource(message) {
  const content = getContent(message)
  const type = getMessageType(message)

  if (type === 'videoMessage') {
    return content.videoMessage
  }

  const quoted = getQuotedMessage(message)

  if (quoted) {
    const quotedContent = getContent({
      message: quoted.message
    })

    if (quotedContent.videoMessage) {
      return quotedContent.videoMessage
    }
  }

  return null
}

async function downloadVideo(media) {
  const stream = await downloadContentFromMessage(media, 'video')
  const chunks = []

  for await (const chunk of stream) {
    chunks.push(chunk)
  }

  return Buffer.concat(chunks)
}

async function makeLivePhoto(videoBuffer) {
  const tempDir = path.join(
    os.tmpdir(),
    `kanshixi-${randomUUID()}`
  )

  await fsp.mkdir(tempDir, {
    recursive: true
  })

  const input = path.join(tempDir, 'input.mp4')
  const cover = path.join(tempDir, 'key-photo.jpg')
  const output = path.join(tempDir, 'live-photo.mp4')

  try {
    await fsp.writeFile(input, videoBuffer)

    const originalDuration = await probeDuration(input)
    const duration = Math.min(
      originalDuration,
      CONFIG.maxDuration
    )

    if (duration <= CONFIG.transition) {
      throw new Error(
        `Video terlalu pendek. Minimal ${CONFIG.transition + 0.1} detik.`
      )
    }

    await execute(ffmpeg, [
      '-hide_banner',
      '-y',
      '-i',
      input,
      '-frames:v',
      '1',
      '-q:v',
      '2',
      cover
    ])

    const offset = duration - CONFIG.transition

    const scale = `scale=w='min(${CONFIG.maxWidth},iw)':h=-2:flags=lanczos`

    const filter = [
      `[0:v]trim=duration=${duration},setpts=PTS-STARTPTS,${scale},fps=${CONFIG.fps},setsar=1,format=yuv420p,tpad=stop_mode=clone:stop_duration=${CONFIG.freeze}[base]`,
      `[1:v]${scale},fps=${CONFIG.fps},setsar=1,format=rgba,fade=t=in:st=${offset}:d=${CONFIG.transition}:alpha=1[still]`,
      `[base][still]overlay=shortest=1:eof_action=repeat:format=auto[vout]`
    ].join(';')

    await execute(ffmpeg, [
      '-hide_banner',
      '-y',
      '-i',
      input,
      '-loop',
      '1',
      '-framerate',
      String(CONFIG.fps),
      '-i',
      cover,
      '-filter_complex',
      filter,
      '-map',
      '[vout]',
      '-map',
      '0:a?',
      '-c:v',
      'libx264',
      '-preset',
      CONFIG.preset,
      '-crf',
      String(CONFIG.crf),
      '-profile:v',
      'high',
      '-pix_fmt',
      'yuv420p',
      '-r',
      String(CONFIG.fps),
      '-c:a',
      'aac',
      '-b:a',
      '192k',
      '-ar',
      '48000',
      '-af',
      'apad',
      '-t',
      String(duration + CONFIG.freeze),
      '-movflags',
      '+faststart',
      output
    ])

    const imageBuffer = await fsp.readFile(cover)
    const motionBuffer = await fsp.readFile(output)

    if (!imageBuffer.length || !motionBuffer.length) {
      throw new Error('Hasil konversi kosong.')
    }

    return {
      image: imageBuffer,
      video: motionBuffer,
      duration,
      totalDuration: duration + CONFIG.freeze
    }
  } finally {
    await fsp.rm(tempDir, {
      recursive: true,
      force: true
    }).catch(() => {})
  }
}

async function sendNativeLivePhoto(
  sock,
  jid,
  imageBuffer,
  videoBuffer
) {
  const imageMedia = await prepareWAMessageMedia(
    {
      image: imageBuffer,
      mimetype: 'image/jpeg'
    },
    {
      upload: sock.waUploadToServer
    }
  )

  const videoMedia = await prepareWAMessageMedia(
    {
      video: videoBuffer,
      mimetype: 'video/mp4'
    },
    {
      upload: sock.waUploadToServer
    }
  )

  const parent = generateWAMessageFromContent(
    jid,
    {
      imageMessage: {
        ...imageMedia.imageMessage,
        contextInfo: {
          pairedMediaType: 5,
          statusSourceType: 0
        }
      }
    },
    {
      userJid: sock.user?.id
    }
  )

  await sock.relayMessage(
    jid,
    parent.message,
    {
      messageId: parent.key.id
    }
  )

  await sock.relayMessage(
    jid,
    {
      videoMessage: {
        ...videoMedia.videoMessage,
        contextInfo: {
          pairedMediaType: 6,
          statusSourceType: 0,
          motionPhotoPresentationOffsetMS: 0
        }
      },
      messageContextInfo: {
        messageAssociation: {
          associationType: 12,
          parentMessageKey: parent.key
        }
      }
    },
    {}
  )

  return parent
}

export default {
  command: [
    'photolive',
    'livephoto',
    'plive',
    'live'
  ],

  async run(ctx) {
    const {
      sock,
      jid,
      message,
      reply,
      react
    } = ctx

    try {
      const media = getVideoSource(message)

      if (!media) {
        return reply(
          `Kirim atau reply video dengan caption *.photolive*\n\n${FOOTER}`
        )
      }

      if (
        media.seconds &&
        media.seconds <= CONFIG.transition
      ) {
        return reply('Video terlalu pendek untuk dibuat Live Photo.')
      }

      if (react) await react('⏳')

      await reply('Sedang membuat Live Photo...')

      const videoBuffer = await downloadVideo(media)

      if (!videoBuffer.length) {
        throw new Error('Video gagal diunduh.')
      }

      const result = await makeLivePhoto(videoBuffer)

      await sendNativeLivePhoto(
        sock,
        jid,
        result.image,
        result.video
      )

      if (react) await react('✅')

      return reply([
        'Live Photo berhasil dibuat!',
        '',
        FOOTER
      ].join('\n'))
    } catch (error) {
      console.error('[PHOTOLIVE]', error)

      if (react) {
        await react('❌').catch(() => {})
      }

      return reply(
        `Gagal membuat Live Photo:\n${error.message || error}\n\n${FOOTER}`
      )
    }
  }
}
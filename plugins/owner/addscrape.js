import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const projectRoot = path.resolve(__dirname, '../..')
const scrapeRoot = path.join(projectRoot, 'scrape')

function resolveScrape(input) {
  let filename = String(input || '')
    .trim()
    .replace(/\\/g, '/')

  if (!filename) {
    throw new Error('Nama file scrape belum diberikan.')
  }

  if (!filename.endsWith('.js')) {
    filename += '.js'
  }

  const parts = filename.split('/')

  if (
    parts.some(part =>
      !part ||
      part === '.' ||
      part === '..' ||
      !/^[a-zA-Z0-9_-]+(?:\.js)?$/.test(part)
    )
  ) {
    throw new Error('Path scrape tidak valid.')
  }

  const destination = path.resolve(scrapeRoot, filename)
  const relative = path.relative(scrapeRoot, destination)

  if (
    !relative ||
    relative.startsWith('..') ||
    path.isAbsolute(relative)
  ) {
    throw new Error('Path berada di luar folder scrape.')
  }

  return {
    filename,
    destination,
    relative: relative.split(path.sep).join('/')
  }
}

function getQuotedSource(ctx) {
  const message = ctx.message?.message || {}

  const context =
    message.extendedTextMessage?.contextInfo ||
    message.imageMessage?.contextInfo ||
    message.videoMessage?.contextInfo ||
    message.documentMessage?.contextInfo

  const quoted = context?.quotedMessage

  if (!quoted) return ''

  return (
    quoted.conversation ||
    quoted.extendedTextMessage?.text ||
    quoted.documentMessage?.caption ||
    quoted.imageMessage?.caption ||
    quoted.videoMessage?.caption ||
    quoted.documentWithCaptionMessage?.message?.documentMessage?.caption ||
    ''
  )
}

async function checkSyntax(file) {
  const { spawn } = await import('node:child_process')

  return new Promise((resolve, reject) => {
    const child = spawn(
      process.execPath,
      ['--check', file],
      {
        stdio: ['ignore', 'pipe', 'pipe']
      }
    )

    let stdout = ''
    let stderr = ''

    child.stdout.on('data', data => {
      stdout += data.toString()
    })

    child.stderr.on('data', data => {
      stderr += data.toString()
    })

    child.on('error', reject)

    child.on('close', code => {
      if (code === 0) {
        resolve(true)
      } else {
        reject(
          new Error(stderr || stdout || 'Syntax JavaScript tidak valid.')
        )
      }
    })
  })
}

async function reloadScrape(file) {
  const url = pathToFileURL(file).href

  await import(`${url}?reload=${Date.now()}`)

  return true
}

export default {
  command: ['addscrape'],
  description: 'Menambahkan file scraper',
  owner: true,

  async run(ctx) {
    const input = ctx.args.join(' ').trim()

    if (!input) {
      return ctx.reply(
        `╭─「 ADD SCRAPE 」
│
├─ Format:
│ .addscrape nama.js
│
├─ Subfolder:
│ .addscrape anime/otakudesu.js
│ .addscrape downloader/tiktok.js
│
├─ Cara:
│ 1. Reply source code JavaScript
│ 2. Jalankan command
│ 3. Syntax diperiksa otomatis
│ 4. File disimpan ke folder scrape
│ 5. Module di-import ulang
│
└─ KANSHIXI SCRAPER SYSTEM`
      )
    }

    let target

    try {
      target = resolveScrape(input)
    } catch (error) {
      return ctx.reply(`❌ ${error.message}`)
    }

    const source = getQuotedSource(ctx).trim()

    if (!source) {
      return ctx.reply(
        '❌ Source code tidak ditemukan.\n\nReply pesan yang berisi kode JavaScript terlebih dahulu.'
      )
    }

    if (Buffer.byteLength(source, 'utf8') > 256 * 1024) {
      return ctx.reply('❌ Ukuran source code maksimal 256 KB.')
    }

    const temporary = `${target.destination}.${Date.now()}.tmp`

    try {
      try {
        await fs.access(target.destination)

        return ctx.reply(
          `❌ File sudah tersedia:\n\nscrape/${target.relative}\n\nGunakan nama file lain agar tidak menimpa file yang sudah ada.`
        )
      } catch (error) {
        if (error.code !== 'ENOENT') throw error
      }

      await fs.mkdir(path.dirname(target.destination), {
        recursive: true
      })

      await fs.writeFile(temporary, source, {
        encoding: 'utf8',
        flag: 'wx'
      })

      await checkSyntax(temporary)

      await fs.rename(temporary, target.destination)

      let reloadStatus = 'Success'
      let reloadError = ''

      try {
        await reloadScrape(target.destination)
      } catch (error) {
        reloadStatus = 'Failed'
        reloadError = error.message
      }

      return ctx.reply(
        `╭━━「 ADD SCRAPE SUCCESS 」
│
├─ File: ${path.basename(target.destination)}
├─ Path: scrape/${target.relative}
├─ Size: ${(Buffer.byteLength(source) / 1024).toFixed(2)} KB
│
├─ Syntax: Valid
├─ Saved: Success
├─ Import: ${reloadStatus}
│
${reloadError ? `├─ Error: ${reloadError}\n│\n` : ''}└─ KANSHIXI SCRAPER SYSTEM`
      )
    } catch (error) {
      await fs.unlink(temporary).catch(() => {})

      return ctx.reply(
        `╭━━「 ADD SCRAPE FAILED 」
│
├─ File: ${target.relative}
├─ Syntax: Failed
│
└─ ${error.message}`
      )
    }
  }
}
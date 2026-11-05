import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawn } from 'node:child_process'
import { loadPlugins } from '../../lib/handler.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const pluginRoot = path.resolve(__dirname, '..')

function resolvePlugin(input) {
  let filename = String(input || '').trim().replace(/\\/g, '/')

  if (!filename) {
    throw new Error('Nama file plugin belum diberikan.')
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
    throw new Error('Path plugin tidak valid.')
  }

  const destination = path.resolve(pluginRoot, filename)
  const relative = path.relative(pluginRoot, destination)

  if (!relative || relative.startsWith('..') || path.isAbsolute(relative)) {
    throw new Error('Path plugin berada di luar folder plugins.')
  }

  return {
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

function checkSyntax(file) {
  return new Promise((resolve, reject) => {
    const child = spawn(
      process.execPath,
      ['--check', file],
      { stdio: ['ignore', 'pipe', 'pipe'] }
    )

    let output = ''

    child.stdout.on('data', chunk => {
      output += chunk.toString()
    })

    child.stderr.on('data', chunk => {
      output += chunk.toString()
    })

    child.on('error', reject)

    child.on('close', code => {
      if (code === 0) {
        resolve(true)
      } else {
        reject(new Error(output || 'Syntax JavaScript tidak valid.'))
      }
    })
  })
}

export default {
  command: ['addplugin'],
  description: 'Menambahkan plugin',
  owner: true,

  async run(ctx) {
    const input = ctx.args.join(' ').trim()

    if (!input) {
      return ctx.reply(
        `╭─「 ADD PLUGIN 」
│
├─ Format:
│ .addplugin folder/nama.js
│
├─ Contoh:
│ .addplugin owner/menu.js
│ .addplugin tools/downloader.js
│
└─ Reply source code plugin.`
      )
    }

    let target

    try {
      target = resolvePlugin(input)
    } catch (error) {
      return ctx.reply(`❌ ${error.message}`)
    }

    const source = getQuotedSource(ctx).trim()

    if (!source) {
      return ctx.reply(
        '❌ Source code tidak ditemukan.\nReply pesan yang berisi kode JavaScript.'
      )
    }

    if (Buffer.byteLength(source, 'utf8') > 256 * 1024) {
      return ctx.reply('❌ Ukuran source code maksimal 256 KB.')
    }

    if (!/\bexport\s+default\b/.test(source)) {
      return ctx.reply('❌ Plugin harus menggunakan export default.')
    }

    const temporary = path.join(
      path.dirname(target.destination),
      `.${path.basename(target.destination, '.js')}.${Date.now()}.js`
    )

    try {
      try {
        await fs.access(target.destination)
        return ctx.reply(`❌ Plugin sudah tersedia:\nplugins/${target.relative}`)
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

      const result = await loadPlugins()

      return ctx.reply(
        `╭─「 ADD PLUGIN BERHASIL 」
│
├─ File: ${path.basename(target.destination)}
├─ Path: plugins/${target.relative}
├─ Size: ${(Buffer.byteLength(source) / 1024).toFixed(2)} KB
├─ Syntax: Valid
├─ Saved: Success
├─ Plugin: Loaded
├─ Command: ${result.commands}
│
└─ KANSHIXI PLUGIN SYSTEM`
      )
    } catch (error) {
      await fs.unlink(temporary).catch(() => {})

      return ctx.reply(
        `╭─「 ADD PLUGIN FAILED 」
│
├─ File: ${target.relative}
│
└─ ${error.message}`
      )
    }
  }
}
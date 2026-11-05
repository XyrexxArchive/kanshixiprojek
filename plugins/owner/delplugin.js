import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
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

  if (
    !relative ||
    relative.startsWith('..') ||
    path.isAbsolute(relative)
  ) {
    throw new Error('Path plugin berada di luar folder plugins.')
  }

  return {
    destination,
    relative: relative.split(path.sep).join('/')
  }
}

export default {
  command: ['delplugin'],
  description: 'Menghapus plugin',
  owner: true,

  async run(ctx) {
    const input = ctx.args.join(' ').trim()

    if (!input) {
      return ctx.reply(
        `╭─「 DELETE PLUGIN 」
│
├─ Format:
│ .delplugin folder/nama.js
│
├─ Contoh:
│ .delplugin owner/menu.js
│ .delplugin tools/downloader.js
│
└─ Hapus file dari folder plugins.`
      )
    }

    let target

    try {
      target = resolvePlugin(input)
    } catch (error) {
      return ctx.reply(`❌ ${error.message}`)
    }

    try {
      const stat = await fs.stat(target.destination)

      if (!stat.isFile()) {
        throw new Error('Target bukan file.')
      }

      await fs.unlink(target.destination)

      const result = await loadPlugins()

      return ctx.reply(
        `╭─「 DELETE PLUGIN BERHASIL 」
│
├─ Path: plugins/${target.relative}
├─ Status: Deleted
├─ Loader: Updated
├─ Command aktif: ${result.commands}
│
└─ Plugin berhasil dihapus.`
      )
    } catch (error) {
      return ctx.reply(
        error.code === 'ENOENT'
          ? `❌ Plugin tidak ditemukan:\nplugins/${target.relative}`
          : `❌ Gagal menghapus plugin:\n${error.message}`
      )
    }
  }
}
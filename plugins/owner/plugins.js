import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { plugins } from '../../lib/handler.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const pluginRoot = path.resolve(__dirname, '..')

function scanPlugins(dir, result = {}) {
  if (!fs.existsSync(dir)) return result

  for (const entry of fs.readdirSync(dir, {
    withFileTypes: true
  })) {
    const target = path.join(dir, entry.name)

    if (entry.isDirectory()) {
      scanPlugins(target, result)
      continue
    }

    if (!entry.isFile() || !entry.name.endsWith('.js')) {
      continue
    }

    const relative = path.relative(pluginRoot, target)
    const folder = path.dirname(relative).split(path.sep).join('/')
    const category = folder === '.' ? 'root' : folder

    if (!result[category]) {
      result[category] = []
    }

    result[category].push(entry.name)
  }

  return result
}

function getCommandCount(filename, folder) {
  const absolute = path.join(
    pluginRoot,
    folder === 'root' ? '' : folder,
    filename
  )

  return absolute
}

export default {
  command: ['plugins', 'listplugin'],
  description: 'Melihat daftar plugin',
  owner: true,

  async run(ctx) {
    const filter = (ctx.args[0] || '').trim().replace(/\\/g, '/')
    const folders = scanPlugins(pluginRoot)

    const categories = Object.keys(folders).sort()

    if (!categories.length) {
      return ctx.reply('Belum ada plugin yang tersedia.')
    }

    let output = [
      '╭━━「 KANSHIXI PLUGINS 」',
      '│',
      `├─ Total folder: ${categories.length}`,
      `├─ Total file: ${categories.reduce((sum, key) => sum + folders[key].length, 0)}`,
      `├─ Total command aktif: ${plugins.size}`,
      '│'
    ]

    let totalShown = 0

    for (const category of categories) {
      if (
        filter &&
        category !== filter &&
        !category.startsWith(`${filter}/`)
      ) {
        continue
      }

      const files = folders[category].sort()

      output.push(`├─ 📁 ${category}/`)

      for (const filename of files) {
        const relative = category === 'root'
          ? filename
          : `${category}/${filename}`

        const commandStatus = fs.existsSync(
          getCommandCount(filename, category)
        )

        output.push(
          `│  ${commandStatus ? '├' : '└'} ${filename}`
        )

        totalShown++
      }

      output.push('│')
    }

    if (!totalShown) {
      return ctx.reply(
        `Folder plugin *${filter}* tidak ditemukan atau masih kosong.`
      )
    }

    output.push(
      `├─ File ditampilkan: ${totalShown}`,
      '│',
      '├─ ADD:',
      '│  .addplugin owner/nama.js',
      '│',
      '├─ DELETE:',
      '│  .delplugin owner/nama.js',
      '│',
      '├─ RELOAD:',
      '│  .reload plugins/owner/nama.js',
      '│',
      '└─ KANSHIXI PLUGIN SYSTEM'
    )

    await ctx.reply(output.join('\n'))
  }
}
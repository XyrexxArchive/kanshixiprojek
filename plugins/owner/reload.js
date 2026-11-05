import path from 'node:path'
import { loadPlugins } from '../../lib/handler.js'
import { reloadProjectFile } from '../../lib/reloader.js'

export default {
  command: ['reload', 'rl'],
  description: 'Reload file project',
  owner: true,

  async run(ctx) {
    const input = ctx.args.join(' ').trim()

    if (!input) {
      return ctx.reply(
        `╭─「 RELOAD SYSTEM 」
│
├─ Format:
│ .reload nama-file.js
│
├─ Contoh:
│ .reload case.js
│ .reload lib/helper.js
│ .reload lib/message.js
│ .reload plugins/owner/menu.js
│
└─ Tanpa argumen:
   .reload plugins`
      )
    }

    try {
      if (input === 'plugins') {
        const result = await loadPlugins()

        return ctx.reply(
          `╭─「 PLUGIN RELOADED 」
│
├─ File dimuat: ${result.files}
├─ Command aktif: ${result.commands}
├─ Gagal: ${result.failed}
│
└─ Plugin berhasil diperbarui.`
        )
      }

      const result = await reloadProjectFile(input)

      if (result.type === 'plugin') {
        const loaded = await loadPlugins()

        return ctx.reply(
          `╭─「 PLUGIN RELOADED 」
│
├─ File: ${result.relative}
├─ Status: Success
├─ Command aktif: ${loaded.commands}
├─ Plugin gagal: ${loaded.failed}
│
└─ Plugin berhasil diperbarui.`
        )
      }

      if (result.type === 'case') {
        return ctx.reply(
          `╭─「 CASE RELOADED 」
│
├─ File: ${result.relative}
├─ Status: Success
│
└─ Case handler berhasil diperbarui.`
        )
      }

      return ctx.reply(
        `╭─「 MODULE RELOADED 」
│
├─ File: ${result.relative}
├─ Status: Imported
│
└─ Module berhasil di-import ulang.`
      )
    } catch (error) {
      return ctx.reply(
        `╭─「 RELOAD FAILED 」
│
└─ ${error.message}`
      )
    }
  }
}
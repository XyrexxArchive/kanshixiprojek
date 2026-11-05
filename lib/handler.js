import fs from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

import settings from '../settings.js'
import { createContext } from './message.js'
import { safeError } from './function.js'
import { getCaseHandler } from './reloader.js'
import { log } from './logger.js'

const plugins = new Map()
const processed = new Map()
const cooldown = new Map()
const registered = new WeakSet()

export async function loadPlugins() {
  const root = path.resolve(process.cwd(), 'plugins')
  const files = []

  function scan(dir) {
    if (!fs.existsSync(dir)) return

    for (const entry of fs.readdirSync(dir, {
      withFileTypes: true
    })) {
      const target = path.join(dir, entry.name)

      if (entry.isDirectory()) {
        scan(target)
      } else if (
        entry.isFile() &&
        entry.name.endsWith('.js')
      ) {
        files.push(target)
      }
    }
  }

  scan(root)
  plugins.clear()

  let loaded = 0
  let failed = 0

  for (const file of files.sort()) {
    const relative = path.relative(process.cwd(), file)

    try {
      const mod = await import(
        `${pathToFileURL(file).href}?v=${Date.now()}-${Math.random()}`
      )

      const plugin = mod.default

      if (
        !plugin ||
        !plugin.command ||
        typeof plugin.run !== 'function'
      ) {
        failed++
        log.warn(`Plugin tidak valid: ${relative}`)
        continue
      }

      const commands = Array.isArray(plugin.command)
        ? plugin.command
        : [plugin.command]

      for (const command of commands) {
        plugins.set(String(command).toLowerCase(), plugin)
      }

      loaded++
      log.success(`Plugin dimuat: ${relative}`)
    } catch (error) {
      failed++

      log.error(
        `Plugin gagal dimuat (${relative}):`,
        error?.message || error
      )
    }
  }

  log.info(
    `Plugin selesai • ${loaded} file • ${plugins.size} command • ${failed} gagal`
  )

  return {
    files: loaded,
    commands: plugins.size,
    failed
  }
}

async function processMessage(sock, message) {
  if (!message?.message || !message.key?.remoteJid) return

  const id = message.key.id

  if (id && processed.has(id)) return

  if (id) {
    processed.set(id, Date.now())

    if (processed.size > 5000) {
      const first = processed.keys().next().value
      processed.delete(first)
    }
  }

  const ctx = await createContext(sock, message)

  log.message({
    from: ctx.pushName,
    jid: ctx.sender,
    chat: ctx.isGroup
      ? `Group • ${ctx.jid}`
      : 'Private',
    text: ctx.text,
    command: ctx.isCommand
      ? `${ctx.prefix}${ctx.command}`
      : ''
  })

  if (!ctx.text) return
  if (!ctx.isCommand || !ctx.command) return

  if (settings.mode === 'self' && !ctx.isOwner) return

  const now = Date.now()
  const previous = cooldown.get(ctx.sender) || 0

  if (
    !ctx.isOwner &&
    now - previous < settings.commandCooldown
  ) {
    return
  }

  cooldown.set(ctx.sender, now)

  try {
    const plugin = plugins.get(ctx.command)

    if (plugin) {
      if (plugin.owner && !ctx.isOwner) {
        return ctx.reply('Command ini khusus owner.')
      }

      if (plugin.group && !ctx.isGroup) {
        return ctx.reply('Command ini hanya untuk grup.')
      }

      if (plugin.private && ctx.isGroup) {
        return ctx.reply('Gunakan command ini di chat pribadi.')
      }

      await plugin.run(ctx)
      ctx.log()
      return
    }

    const runCase = await getCaseHandler()
    const handled = await runCase(ctx)

    if (handled) {
      ctx.log()
      return
    }

    await ctx.reply(
      `Command *${ctx.command}* tidak ditemukan.\nKetik ${ctx.prefix}menu untuk melihat daftar command.`
    )
  } catch (error) {
    log.error(
      `Command .${ctx.command} gagal:`,
      error?.stack || error
    )

    await ctx.reply(
      `Terjadi kesalahan:\n${safeError(error)}`
    ).catch(() => {})
  }
}

export function registerEvents(sock) {
  if (registered.has(sock)) {
    log.warn('Event socket sudah terdaftar.')
    return
  }

  registered.add(sock)

  log.info('Mendaftarkan event WhatsApp...')

  sock.ev.process(async events => {
    const upsert = events['messages.upsert']

    if (!upsert) return

    const {
      messages = [],
      type
    } = upsert

    for (const message of messages) {
      try {
        if (type !== 'notify') continue

        await processMessage(sock, message)
      } catch (error) {
        log.error(
          'Gagal memproses pesan:',
          error?.stack || error
        )
      }
    }
  })

  sock.ev.on('lid-mapping.update', () => {})

  log.success('Event WhatsApp aktif.')
}

export { plugins }
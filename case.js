import vm from 'node:vm'
import os from 'node:os'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import settings from './settings.js'
import database from './lib/database.js'
import { normalizeJid, formatUptime } from './lib/function.js'
import { readFile, unlink } from 'node:fs/promises'

const execFileAsync = promisify(execFile)



async function sendInteractiveMenu(ctx, page = 'home') {
  const prefix = settings.prefix || '.'
  const pages = {
    home: [
      `Hai ${ctx.pushName} 👋`,
      `╭━━〔 ${settings.namebot.toUpperCase()} 〕━━╮`,
      `│ Developer : ${settings.author}`,
      `│ Mode      : ${settings.mode.toUpperCase()}`,
      `│ Prefix    : ${prefix}`,
      `│ Runtime   : ${formatUptime(process.uptime())}`,
      '╰━━━━━━━━━━━━━━━━━━━━╯',
      '',
      '「 MENU CATEGORY 」',
      `│ ${prefix}menumain   — Main commands`,
      `│ ${prefix}menutools  — Downloader & tools`,
      `│ ${prefix}menugroup  — Group management`,
      `│ ${prefix}rpg        — Adventure RPG`,
      `│ ${prefix}game       — Mini games`,
      `│ ${prefix}menuowner  — Owner commands`,
      '',
      'Ketik command kategori untuk membuka daftar lengkap.'
    ],
    main: [
      '╭━━〔 MAIN MENU 〕━━╮',
      `│ ${prefix}menu — Menu utama`,
      `│ ${prefix}ping — Cek latency`,
      `│ ${prefix}runtime — Informasi runtime`,
      `│ ${prefix}owner — Kontak owner`,
      `│ ${prefix}rpg — Adventure RPG`,
      `│ ${prefix}game — Mini games`,
      '╰━━━━━━━━━━━━━━━━━━╯'
    ],
    tools: [
      '╭━━〔 TOOLS MENU 〕━━╮',
      `│ ${prefix}pin — Pinterest search/download`,
      `│ ${prefix}cekidch — Cek ID channel`,
      `│ ${prefix}get URL — Ambil konten URL`,
      `│ ${prefix}tiktok URL — Download TikTok`,
      `│ ${prefix}tourl — Upload media ke URL`,
      `│ ${prefix}ping — Cek latency`,
      `│ ${prefix}tohd — Photo/Video hd`,
      `│ ${prefix}photolive — Video To PhotoLive`,
      '╰━━━━━━━━━━━━━━━━━━╯'
    ],
    group: [
      '╭━━〔 GROUP MENU 〕━━╮',
      `│ ${prefix}group info/open/close`,
      `│ ${prefix}group lock/unlock`,
      `│ ${prefix}group name <teks>`,
      `│ ${prefix}group desc <teks>`,
      `│ ${prefix}group link/revoke`,
      `│ ${prefix}menugroup2 — Member tools`,
      '╰━━━━━━━━━━━━━━━━━━╯'
    ],
    group2: [
      '╭━━〔 MEMBER MANAGEMENT 〕━━╮',
      `│ ${prefix}add @user`,
      `│ ${prefix}kick @user`,
      `│ ${prefix}promote @user`,
      `│ ${prefix}demote @user`,
      `│ ${prefix}tagall [pesan]`,
      `│ ${prefix}everyone [pesan]`,
      '╰━━━━━━━━━━━━━━━━━━━━━━━━━━╯'
    ],
    owner: [
      '╭━━〔 OWNER MENU 〕━━╮',
      `│ ${prefix}owner — Kontak owner`,
      `│ ${prefix}addowner 628xxx`,
      `│ ${prefix}delowner 628xxx`,
      `│ ${prefix}listowner`,
      `│ ${prefix}self / ${prefix}public`,
      `│ ${prefix}eval <kode>`,
      `│ ${prefix}exec <command>`,
      `│ ${prefix}plugins`,
      `│ ${prefix}menuowner2 — Plugin tools`,
      '╰━━━━━━━━━━━━━━━━━━╯'
    ],
    owner2: [
      '╭━━〔 OWNER PLUGIN TOOLS 〕━━╮',
      `│ ${prefix}addplugin folder/nama.js`,
      `│ ${prefix}delplugin folder/nama.js`,
      `│ ${prefix}addscrape folder/nama.js`,
      `│ ${prefix}reload plugins`,
      `│ ${prefix}reload case.js`,
      `│ ${prefix}plugins`,
      '╰━━━━━━━━━━━━━━━━━━━━━━━━━━╯'
    ]
  }
  await ctx.reply(`${(pages[page] || pages.home).join('\n')}\n\n> *_Powered By Kanshixi_*`)
}

export default async function runCase(ctx) {
  const { sock, command, args, body, jid, sender, isOwner, isGroup, reply } = ctx

  switch (command) {
    case 'kan':
    case 'menu':
      await sendInteractiveMenu(ctx, 'home')
      return true
    case 'menumain':
      await sendInteractiveMenu(ctx, 'main')
      return true
    case 'menutools':
      await sendInteractiveMenu(ctx, 'tools')
      return true
    case 'menugroup':
      await sendInteractiveMenu(ctx, 'group')
      return true
    case 'menugroup2':
      await sendInteractiveMenu(ctx, 'group2')
      return true
    case 'menuowner':
      await sendInteractiveMenu(ctx, 'owner')
      return true
    case 'menuowner2':
      await sendInteractiveMenu(ctx, 'owner2')
      return true
    case 'ping': {
      const start = performance.now()
      const sent = await reply('Pong!')
      const latency = (performance.now() - start).toFixed(2)
      await reply(`Latency: ${latency} ms`)
      return true
    }
    case 'runtime':
      await reply(`Uptime: ${Math.floor(process.uptime())} detik\nNode: ${process.version}\nMode: ${settings.mode}`)
      return true
    case 'owner': {
  const owners = database.getOwners()

  if (!owners.length) {
    await reply('Owner belum diatur.')
    return true
  }

  for (const owner of owners) {
    const number = owner.split('@')[0].replace(/\D/g, '')
    if (!number) continue

    const vcard = [
      'BEGIN:VCARD',
      'VERSION:3.0',
      `FN:${settings.author}`,
      `ORG:${settings.namebot};`,
      `TEL;type=CELL;type=VOICE;waid=${number}:+${number}`,
      'END:VCARD'
    ].join('\n')

    await sock.sendMessage(jid, {
      contacts: {
        displayName: settings.author,
        contacts: [{ vcard }]
      }
    })
  }

  return true
}
    case 'self':
    case 'public':
      if (!isOwner) return reply('Khusus owner.')
      settings.mode = command
      database.set('mode', command)
      await reply(`Mode bot diubah ke *${command}*.`)
      return true
    case 'addowner': {
      if (!isOwner) return reply('Khusus owner.')
      const number = (args[0] || '').replace(/\D/g, '')
      if (number.length < 6 || number.length > 15 || number.startsWith('0')) return reply('Format: .addowner 628xxxxxxxx')
      database.addOwner(`${number}@s.whatsapp.net`)
      await reply(`Owner ditambahkan: ${number}`)
      return true
    }
    case 'delowner': {
      if (!isOwner) return reply('Khusus owner.')
      const number = (args[0] || '').replace(/\D/g, '')
      if (!number) return reply('Format: .delowner 628xxxxxxxx')
      const removed = database.deleteOwner(`${number}@s.whatsapp.net`)
      await reply(removed ? `Owner ${number} dihapus.` : 'Owner tidak ditemukan.')
      return true
    }
    case 'listowner':
      if (!isOwner) return reply('Khusus owner.')
      await reply(database.getOwners().join('\n') || 'Kosong.')
      return true
    case 'promote':
    case 'demote': {
      if (!isGroup) return reply('Khusus grup.')
      if (!isOwner && !ctx.fromMe) return reply('Khusus owner bot.')
      const metadata = await sock.groupMetadata(jid)
      const botJid = normalizeJid(sock.user?.id)
      const botIsAdmin = metadata.participants?.some(p => normalizeJid(p.id) === botJid && ['admin', 'superadmin'].includes(p.admin))
      if (!botIsAdmin) return reply('Bot harus menjadi admin grup.')
      const mentioned = ctx.message.message?.extendedTextMessage?.contextInfo?.mentionedJid || []
      const quoted = ctx.message.message?.extendedTextMessage?.contextInfo?.participant
      const target = mentioned[0] || quoted
      if (!target) return reply(`Tag atau reply anggota yang ingin di-${command}.`)
      await sock.groupParticipantsUpdate(jid, [target], command)
      await reply(`Berhasil ${command}: ${target}`)
      return true
    }
    case 'linkgc': {
      if (!isGroup) return reply('Gunakan di dalam grup.')
      const metadata = await sock.groupMetadata(jid)
      const botJid = normalizeJid(sock.user?.id)
      const bot = metadata.participants?.find(p => normalizeJid(p.id) === botJid)
      if (!['admin', 'superadmin'].includes(bot?.admin)) return reply('Bot harus admin untuk mengambil link grup.')
      const code = await sock.groupInviteCode(jid)
      await reply(`https://chat.whatsapp.com/${code}`)
      return true
    }
    case 'eval': {
      if (!isOwner) return reply('Khusus owner.')
      const code = body.trim()
      if (!code) return reply('Masukkan kode JavaScript.')
      try {
        const AsyncFunction = Object.getPrototypeOf(async function(){}).constructor
        const sandbox = { sock, ctx, m: ctx.message, args, settings, database, console, Buffer, setTimeout, clearTimeout, jid, sender, reply, require: (await import('node:module')).createRequire(import.meta.url) }
        const fn = new AsyncFunction(...Object.keys(sandbox), code)
        let result = await Promise.race([
          fn(...Object.values(sandbox)),
          new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout 40 detik')), 40000))
        ])
        if (result instanceof Promise) result = await result
        await reply(typeof result === 'string' ? result : JSON.stringify(result, null, 2) ?? String(result))
      } catch (error) {
        await reply(String(error.stack || error))
      }
      return true
    }
    case 'exec': {
      if (!isOwner) return reply('Khusus owner.')
      const shell = body.trim()
      if (!shell) return reply('Format: .exec <command>')
      try {
        const { stdout, stderr } = await execFileAsync('/bin/sh', ['-lc', shell], {
          timeout: 15000,
          maxBuffer: 1024 * 1024,
          cwd: process.cwd()
        })
        await reply((stdout || stderr || 'Selesai tanpa output.').slice(0, 3500))
      } catch (error) {
        await reply(`${error.message}\n${error.stderr || ''}`.slice(0, 3500))
      }
      return true
    }
    default:
      return false
  }
}

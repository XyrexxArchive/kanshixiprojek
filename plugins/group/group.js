function getContextInfo(message) {
  const content = message?.message || {}

  return (
    content.extendedTextMessage?.contextInfo ||
    content.imageMessage?.contextInfo ||
    content.videoMessage?.contextInfo ||
    content.documentMessage?.contextInfo ||
    content.documentWithCaptionMessage?.message?.documentMessage?.contextInfo ||
    {}
  )
}

function getTargets(ctx) {
  const contextInfo = getContextInfo(ctx.message)

  const mentions = contextInfo.mentionedJid || []

  const numbers = ctx.args
    .map(value => value.replace(/[^0-9]/g, ''))
    .filter(value => value.length >= 7)
    .map(value => `${value}@s.whatsapp.net`)

  const targets = [...mentions, ...numbers]

  if (!targets.length && contextInfo.participant) {
    targets.push(contextInfo.participant)
  }

  return [...new Set(targets)]
}

function help(prefix) {
  return [
    '*GROUP MANAGEMENT*',
    '',
    `• ${prefix}group info`,
    `• ${prefix}group open`,
    `• ${prefix}group close`,
    `• ${prefix}group lock`,
    `• ${prefix}group unlock`,
    `• ${prefix}group name <nama>`,
    `• ${prefix}group desc <deskripsi>`,
    `• ${prefix}group link`,
    `• ${prefix}group revoke`,
    '',
    `• ${prefix}add <nomor/mention>`,
    `• ${prefix}kick @user`,
    `• ${prefix}promote @user`,
    `• ${prefix}demote @user`,
    '',
    'Target dapat menggunakan mention, reply, atau nomor dengan kode negara.'
  ].join('\n')
}

function isAdminParticipant(participant) {
  return (
    participant?.admin === 'admin' ||
    participant?.admin === 'superadmin' ||
    participant?.isAdmin === true ||
    participant?.isSuperAdmin === true
  )
}

export default {
  command: [
    'group',
    'add',
    'kick',
    'promote',
    'demote'
  ],

  description: 'Group management',
  group: true,

  async run(ctx) {
    await ctx.checkGroupAdmin()

    const command = ctx.command

    if (command === 'group') {
      const [subcommand, ...values] = ctx.args
      const action = (subcommand || '').toLowerCase()
      const value = values.join(' ').trim()

      if (!action || ['help', 'menu'].includes(action)) {
        return ctx.reply(help(ctx.prefix))
      }

      const metadata = ctx.groupMetadata

      if (action === 'info') {
        const participants = metadata?.participants || []
        const admins = participants.filter(isAdminParticipant)

        return ctx.reply([
          '*GROUP INFORMATION*',
          '',
          `• Nama: ${metadata?.subject || '-'}`,
          `• ID: ${metadata?.id || ctx.jid}`,
          `• Member: ${participants.length}`,
          `• Admin: ${admins.length}`,
          `• Admin pengirim: ${ctx.admin ? 'true' : 'false'}`,
          `• Bot admin: ${ctx.botAdmin ? 'true' : 'false'}`,
          `• Mode pesan: ${metadata?.announce ? 'Admin only' : 'Semua member'}`,
          `• Edit info: ${metadata?.restrict ? 'Admin only' : 'Semua member'}`
        ].join('\n'))
      }

      const adminOnly = [
        'open',
        'close',
        'lock',
        'unlock',
        'name',
        'desc',
        'revoke'
      ]

      if (adminOnly.includes(action) && !ctx.admin && !ctx.isOwner) {
        return ctx.reply('Fitur ini hanya dapat digunakan oleh admin grup.')
      }

      const botRequired = [
        'open',
        'close',
        'lock',
        'unlock',
        'name',
        'desc',
        'revoke'
      ]

      if (botRequired.includes(action) && !ctx.botAdmin) {
        return ctx.reply('Bot harus menjadi admin grup untuk melakukan tindakan ini.')
      }

      if (action === 'open') {
        await ctx.sock.groupSettingUpdate(ctx.jid, 'not_announcement')
        return ctx.reply('Grup berhasil dibuka. Semua member dapat mengirim pesan.')
      }

      if (action === 'close') {
        await ctx.sock.groupSettingUpdate(ctx.jid, 'announcement')
        return ctx.reply('Grup berhasil ditutup. Hanya admin dapat mengirim pesan.')
      }

      if (action === 'lock') {
        await ctx.sock.groupSettingUpdate(ctx.jid, 'locked')
        return ctx.reply('Info grup dikunci. Hanya admin dapat mengubah informasi grup.')
      }

      if (action === 'unlock') {
        await ctx.sock.groupSettingUpdate(ctx.jid, 'unlocked')
        return ctx.reply('Info grup dibuka. Semua member dapat mengubah informasi grup.')
      }

      if (action === 'name') {
        if (!value) {
          return ctx.reply(`Contoh: ${ctx.prefix}group name Kanshixi Community`)
        }

        await ctx.sock.groupUpdateSubject(ctx.jid, value)
        return ctx.reply('Nama grup berhasil diperbarui.')
      }

      if (action === 'desc') {
        if (!value) {
          return ctx.reply(`Contoh: ${ctx.prefix}group desc Deskripsi grup baru`)
        }

        await ctx.sock.groupUpdateDescription(ctx.jid, value)
        return ctx.reply('Deskripsi grup berhasil diperbarui.')
      }

      if (action === 'link') {
        const code = await ctx.sock.groupInviteCode(ctx.jid)
        return ctx.reply(`https://chat.whatsapp.com/${code}`)
      }

      if (action === 'revoke') {
        await ctx.sock.groupRevokeInvite(ctx.jid)
        return ctx.reply('Link undangan grup berhasil diperbarui.')
      }

      return ctx.reply(help(ctx.prefix))
    }

    const actions = {
      add: 'add',
      kick: 'remove',
      promote: 'promote',
      demote: 'demote'
    }

    const action = actions[command]

    if (!action) return

    if (!ctx.admin && !ctx.isOwner) {
      return ctx.reply('Hanya admin grup yang dapat menggunakan command ini.')
    }

    if (!ctx.botAdmin) {
      return ctx.reply('Bot harus menjadi admin grup untuk menjalankan command ini.')
    }

    const targets = getTargets(ctx)

    if (!targets.length) {
      return ctx.reply(
        `Tag, reply pesan target, atau masukkan nomor.\nContoh: ${ctx.prefix}${command} 6281234567890`
      )
    }

    const result = await ctx.sock.groupParticipantsUpdate(
      ctx.jid,
      targets,
      action
    )

    const lines = (result || []).map(item => {
      const status = String(item.status || '200')
      const number = String(item.jid || '').split('@')[0]

      return `• @${number}: ${
        status === '200' ? 'Success' : `Failed (${status})`
      }`
    })

    return ctx.sock.sendMessage(
      ctx.jid,
      {
        text: `*GROUP ${command.toUpperCase()}*\n\n${lines.join('\n') || 'Permintaan diproses.'}`,
        mentions: targets
      },
      { quoted: ctx.message }
    )
  }
}
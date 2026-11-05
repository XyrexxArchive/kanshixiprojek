import {
  getMessageText,
  getSenderCandidates,
  isGroupJid,
  normalizeJid
} from './function.js'

import database from './database.js'
import settings from '../settings.js'

export async function createContext(sock, message) {
  const jid = message.key?.remoteJid || ''
  const senderCandidates = getSenderCandidates(message)

  const lidMapping = sock.signalRepository?.lidMapping

  if (lidMapping?.getPNForLID) {
    for (const candidate of [...senderCandidates]) {
      if (!candidate.endsWith('@lid')) continue

      try {
        const pn = await lidMapping.getPNForLID(candidate)

        if (pn) {
          const normalized = normalizeJid(pn)

          if (!senderCandidates.includes(normalized)) {
            senderCandidates.push(normalized)
          }
        }
      } catch {}
    }
  }

  const sender = normalizeJid(
    message.key?.participantAlt ||
    message.key?.participant ||
    message.key?.remoteJidAlt ||
    message.senderPn ||
    jid
  )

  const fromMe = Boolean(message.key?.fromMe)
  const isGroup = isGroupJid(jid)
  const text = getMessageText(message)
  const prefix = settings.prefix
  const isCommand = text.startsWith(prefix)
  const withoutPrefix = isCommand
    ? text.slice(prefix.length).trim()
    : text.trim()

  const [command = '', ...args] = withoutPrefix.split(/\s+/)
  const body = args.join(' ')

  const isOwner = fromMe || database.isOwner(senderCandidates)

  const ctx = {
    sock,
    message,
    jid,
    sender,
    senderCandidates,
    text,
    command: command.toLowerCase(),
    args,
    body,
    prefix,
    isCommand,
    isGroup,
    fromMe,
    isOwner,
    admin: false,
    botAdmin: false,
    groupMetadata: null,
    pushName: message.pushName || 'User',
    quoted: message.message,

    reply: (content, options = {}) =>
      sock.sendMessage(
        jid,
        typeof content === 'string' ? { text: content } : content,
        { quoted: message, ...options }
      ),

    react: emoji =>
      sock.sendMessage(jid, {
        react: {
          text: emoji,
          key: message.key
        }
      }),

    send: (content, options = {}) =>
      sock.sendMessage(jid, content, options),

    mention: (text, mentions = []) =>
      sock.sendMessage(
        jid,
        { text, mentions },
        { quoted: message }
      ),

    log: () => database.log(command || 'message', sender)
  }

  ctx.checkGroupAdmin = async () => {
    if (!ctx.isGroup) {
      ctx.admin = false
      ctx.botAdmin = false
      ctx.groupMetadata = null
      return ctx
    }

    const metadata = await sock.groupMetadata(jid)
    ctx.groupMetadata = metadata

    const sameJid = (left, right) => {
      if (!left || !right) return false

      const normalize = value => {
        try {
          return normalizeJid(value)
        } catch {
          return String(value).split(':')[0]
        }
      }

      const a = normalize(left)
      const b = normalize(right)

      if (a === b) return true

      const [aUser, aServer] = a.split('@')
      const [bUser, bServer] = b.split('@')

      return Boolean(
        aUser &&
        bUser &&
        aUser === bUser &&
        aServer === bServer
      )
    }

    const participants = metadata?.participants || []

    const isAdmin = participant => Boolean(
      participant?.admin === 'admin' ||
      participant?.admin === 'superadmin' ||
      participant?.isAdmin === true ||
      participant?.isSuperAdmin === true
    )

    const getIds = participant => [
      participant?.id,
      participant?.jid,
      participant?.phoneNumber,
      participant?.lid,
      participant?.pn
    ].filter(Boolean)

    const senderIds = [
      ...new Set([
        ...senderCandidates,
        sender,
        message.key?.participant,
        message.key?.participantAlt
      ].filter(Boolean))
    ]

    const botIds = [
      ...new Set([
        sock.user?.id,
        sock.user?.lid,
        sock.user?.jid,
        sock.user?.phoneNumber
      ].filter(Boolean))
    ]

    ctx.admin = participants.some(participant =>
      isAdmin(participant) &&
      getIds(participant).some(id =>
        senderIds.some(candidate => sameJid(id, candidate))
      )
    )

    ctx.botAdmin = participants.some(participant =>
      isAdmin(participant) &&
      getIds(participant).some(id =>
        botIds.some(candidate => sameJid(id, candidate))
      )
    )

    return ctx
  }

  return ctx
}
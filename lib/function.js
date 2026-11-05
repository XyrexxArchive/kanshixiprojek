import {
  normalizeMessageContent,
  getContentType,
  jidNormalizedUser
} from 'baileys'

export function unwrapMessage(input = {}) {
  const raw = input.message || input
  return normalizeMessageContent(raw) || {}
}

export function getMessageText(input = {}) {
  const content = unwrapMessage(input)
  const type = getContentType(content)

  if (!type) return ''

  const message = content[type] || {}

  let nativeFlowId = ''
  const paramsJson = message.nativeFlowResponseMessage?.paramsJson

  if (typeof paramsJson === 'string' && paramsJson) {
    try {
      const params = JSON.parse(paramsJson)
      nativeFlowId =
        params.id ||
        params.rowId ||
        params.row_id ||
        params.selectedRowId ||
        params.selected_row_id ||
        params.buttonId ||
        params.button_id ||
        ''
    } catch {}
  }

  return (
    content.conversation ||
    content.extendedTextMessage?.text ||
    message.singleSelectReply?.selectedRowId ||
    nativeFlowId ||
    message.selectedButtonId ||
    message.selectedId ||
    message.text ||
    message.caption ||
    message.body?.text ||
    ''
  ).trim()
}

export function normalizeJid(jid) {
  if (!jid) return ''

  try {
    return jidNormalizedUser(jid)
  } catch {
    return jid
  }
}

export function getSenderCandidates(message) {
  const key = message?.key || {}

  const candidates = [
    key.participant,
    key.participantAlt,
    message?.participant,
    message?.participantAlt,
    message?.senderPn,
    key.participantPn,
    key.remoteJid,
    key.remoteJidAlt
  ].filter(Boolean)

  return [...new Set(candidates.map(value => {
    try {
      return jidNormalizedUser(value)
    } catch {
      return String(value)
    }
  }))]
}

export function isGroupJid(jid = '') {
  return jid.endsWith('@g.us')
}

export function getQuotedMessage(message = {}) {
  const content = unwrapMessage(message)

  const type = getContentType(content)
  return content[type]?.contextInfo || {}
}

export function formatUptime(seconds) {
  const days = Math.floor(seconds / 86400)
  const hours = Math.floor(seconds % 86400 / 3600)
  const minutes = Math.floor(seconds % 3600 / 60)

  return [
    days && `${days}d`,
    hours && `${hours}h`,
    minutes && `${minutes}m`,
    `${Math.floor(seconds % 60)}s`
  ].filter(Boolean).join(' ')
}

export function safeError(error) {
  return String(error?.stack || error?.message || error || 'Unknown error')
    .slice(0, 1500)
}
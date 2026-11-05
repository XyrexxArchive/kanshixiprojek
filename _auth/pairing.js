import readline from 'node:readline/promises'
import { stdin as input, stdout as output } from 'node:process'

export function normalizePhoneNumber(value) {
  const number = String(value || '').replace(/\D/g, '')
  if (number.length < 6 || number.length > 15 || number.startsWith('0')) {
    throw new Error('Nomor harus format internasional. Contoh Indonesia: 6281234567890')
  }
  return number
}

export async function getPairingNumber(configuredNumber = '') {
  if (configuredNumber) return normalizePhoneNumber(configuredNumber)
  const rl = readline.createInterface({ input, output })
  try {
    const answer = await rl.question('Masukkan nomor WhatsApp format internasional (contoh 62812xxxx): ')
    return normalizePhoneNumber(answer)
  } finally {
    rl.close()
  }
}

export async function requestPairingCode(sock, state, phoneNumber) {
  if (state.creds.registered) return null
  await new Promise(resolve => setTimeout(resolve, 2500))
  const code = await sock.requestPairingCode(normalizePhoneNumber(phoneNumber))
  return String(code).match(/.{1,4}/g)?.join('-') || code
}

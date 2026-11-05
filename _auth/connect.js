import makeWASocket, {
  useSqliteAuthState,
  makeCacheableSignalKeyStore,
  DisconnectReason,
  Browsers
} from 'baileys'
import pino from 'pino'
import settings from '../settings.js'
import { getPairingNumber, requestPairingCode } from './pairing.js'
import { registerEvents } from '../lib/handler.js'
import { log } from '../lib/logger.js'

const logger = pino({ level: process.env.LOG_LEVEL || 'silent' })
let activeSocket = null
let reconnectTimer = null
let reconnectAttempts = 0
let starting = false
let stopped = false


export async function connectBot(onReady) {
  if (starting || stopped) return activeSocket
  starting = true

  try {
    const auth = await useSqliteAuthState({ dbPath: settings.authDatabase })
    const { state, saveCreds } = auth
    let pairingRequested = state.creds.registered

    const sock = makeWASocket({
      auth: {
        creds: state.creds,
        keys: makeCacheableSignalKeyStore(state.keys, logger)
      },
      logger,
      browser: Browsers.ubuntu('Chrome'),
      printQRInTerminal: false,
      markOnlineOnConnect: false,
      syncFullHistory: false,
      fireInitQueries: true,
      generateHighQualityLinkPreview: false,
      emitOwnEvents: true,
      defaultQueryTimeoutMs: 60000,
      connectTimeoutMs: 60000,
      keepAliveIntervalMs: 25000,
      retryRequestDelayMs: 250,
      maxMsgRetryCount: 3,
      maxRetryQueueSize: 64,
      ackRetryDelayMs: 750,
      maxAckRetryCount: 3,
      getMessage: async () => ({ conversation: '' })
    })

    activeSocket = sock

sock.ev.on('creds.update', saveCreds)

    registerEvents(sock)

    sock.ev.on('connection.update', async update => {
      const { connection, lastDisconnect } = update

      if (connection === 'connecting' && !state.creds.registered && !pairingRequested) {
        pairingRequested = true
        try {
          const number = await getPairingNumber(settings.phoneNumber)
          const code = await requestPairingCode(sock, state, number)
          if (code) {
            console.log()
            log.warn('PAIRING CODE', code)
            log.info('Buka WhatsApp > Perangkat tertaut > Tautkan dengan nomor telepon.')
          }
        } catch (error) {
          pairingRequested = false
          log.error('Gagal meminta pairing code:', error?.message || error)
        }
      }

      if (connection === 'open') {
        reconnectAttempts = 0
        log.success('WhatsApp berhasil terhubung.')
        await onReady?.(sock)
      }

      if (connection === 'close') {
        const statusCode = lastDisconnect?.error?.output?.statusCode
        const loggedOut = statusCode === DisconnectReason.loggedOut
        log.warn('Koneksi WhatsApp terputus.', `Code: ${statusCode || 'unknown'} • ${lastDisconnect?.error?.message || 'no detail'}`)
        if (loggedOut) {
          log.error('Sesi logout. Hapus _auth/session.sqlite hanya jika ingin pairing ulang.')
          return
        }
        scheduleReconnect(onReady)
      }
    })

    starting = false
    return sock
  } catch (error) {
    starting = false
    log.error('Gagal membuat socket:', error?.stack || error)
    scheduleReconnect(onReady)
    return null
  }
}

function scheduleReconnect(onReady) {
  if (stopped || reconnectTimer) return
  reconnectAttempts += 1
  const delay = Math.min(settings.reconnectDelay * 2 ** Math.min(reconnectAttempts - 1, 4), settings.maxReconnectDelay)
  log.warn(`Mencoba koneksi ulang dalam ${Math.ceil(delay / 1000)} detik...`, `Percobaan ${reconnectAttempts}`)
  reconnectTimer = setTimeout(async () => {
    reconnectTimer = null
    starting = false
    await connectBot(onReady)
  }, delay)
  reconnectTimer.unref?.()
}

export function getSocket() {
  return activeSocket
}

export async function shutdown() {
  stopped = true
  if (reconnectTimer) clearTimeout(reconnectTimer)
  reconnectTimer = null
  try {
    activeSocket?.end?.(new Error('Process shutdown'))
  } catch {}
}

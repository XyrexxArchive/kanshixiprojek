import process from 'node:process'
import { connectBot, shutdown } from './_auth/connect.js'
import { loadPlugins } from './lib/handler.js'
import database from './lib/database.js'
import settings from './settings.js'
import { banner, log } from './lib/logger.js'

settings.mode = database.get('mode', settings.mode)

async function boot() {
  banner()
  await loadPlugins()
  log.info('Menginisialisasi koneksi WhatsApp...')
  await connectBot()
}

process.on('uncaughtException', error => log.error('Uncaught exception:', error?.stack || error))
process.on('unhandledRejection', error => log.error('Unhandled rejection:', error?.stack || error))
process.once('SIGINT', async () => {
  log.warn('Mematikan Kanshixi...')
  await shutdown()
  database.close()
  process.exit(0)
})
process.once('SIGTERM', async () => {
  log.warn('Mematikan Kanshixi...')
  await shutdown()
  database.close()
  process.exit(0)
})

boot().catch(error => {
  log.error('Boot gagal:', error?.stack || error)
  process.exitCode = 1
})

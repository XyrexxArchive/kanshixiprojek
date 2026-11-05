import { fileURLToPath } from 'node:url'
import path from 'node:path'

import packageJson from './package.json' with { type: 'json' }

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const settings = {
  namebot: 'kanshixi',
  author: 'xyrcodex',
  version: '1.0.0',
  prefix: '.',
  mode: 'public',
  owner: ['628xxxxxxxxx'], // Settings nomor buat di jadiin owner
  phoneNumber: '628xxxxxxxxx', // Settings Nomor Buat Konek Pairing
  sessionName: 'kanshixi',
  authDatabase: path.join(__dirname, '_auth', 'session.sqlite'),
  database: path.join(__dirname, 'kanshixi.sqlite'),
  thumbnail: path.join(__dirname, 'thumbnail', 'image.jpg'),
  printQRInTerminal: false,
  reconnectDelay: 3000,
  maxReconnectDelay: 30000,
  pairingDelay: 2500,
  commandCooldown: 350,
  timezone: 'Asia/Jakarta',
  debe: packageJson.dependencies?.['better-sqlite3'] || 'Unknown'
}

export default settings

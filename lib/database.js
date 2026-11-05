import Database from 'better-sqlite3'
import settings from '../settings.js'

const db = new Database(settings.database)
db.pragma('journal_mode = WAL')
db.pragma('synchronous = NORMAL')
db.pragma('foreign_keys = ON')
db.pragma('busy_timeout = 5000')

db.exec(`
CREATE TABLE IF NOT EXISTS owners (
  jid TEXT PRIMARY KEY,
  added_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS usage (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  command TEXT NOT NULL,
  sender TEXT,
  created_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS rpg_users (
  jid TEXT PRIMARY KEY, name TEXT NOT NULL, level INTEGER NOT NULL DEFAULT 1,
  exp INTEGER NOT NULL DEFAULT 0, money INTEGER NOT NULL DEFAULT 500,
  bank INTEGER NOT NULL DEFAULT 0, hp INTEGER NOT NULL DEFAULT 100,
  max_hp INTEGER NOT NULL DEFAULT 100, energy INTEGER NOT NULL DEFAULT 100,
  hunger INTEGER NOT NULL DEFAULT 100, thirst INTEGER NOT NULL DEFAULT 100,
  attack INTEGER NOT NULL DEFAULT 10, defense INTEGER NOT NULL DEFAULT 5,
  wins INTEGER NOT NULL DEFAULT 0, losses INTEGER NOT NULL DEFAULT 0,
  kills INTEGER NOT NULL DEFAULT 0, fish INTEGER NOT NULL DEFAULT 0,
  mines INTEGER NOT NULL DEFAULT 0, hunts INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS rpg_inventory (
  jid TEXT NOT NULL, item TEXT NOT NULL, amount INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY(jid,item), FOREIGN KEY(jid) REFERENCES rpg_users(jid) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS rpg_cooldowns (
  jid TEXT NOT NULL, action TEXT NOT NULL, until INTEGER NOT NULL,
  PRIMARY KEY(jid,action)
);
CREATE TABLE IF NOT EXISTS rpg_farms (
  id INTEGER PRIMARY KEY AUTOINCREMENT, jid TEXT NOT NULL, planted_at INTEGER NOT NULL,
  FOREIGN KEY(jid) REFERENCES rpg_users(jid) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS rpg_game_sessions (
  jid TEXT NOT NULL, game TEXT NOT NULL, data TEXT NOT NULL,
  expires_at INTEGER NOT NULL, PRIMARY KEY(jid, game)
);
CREATE TABLE IF NOT EXISTS rpg_game_stats (
  jid TEXT NOT NULL, game TEXT NOT NULL, played INTEGER NOT NULL DEFAULT 0,
  wins INTEGER NOT NULL DEFAULT 0, losses INTEGER NOT NULL DEFAULT 0,
  reward INTEGER NOT NULL DEFAULT 0, PRIMARY KEY(jid, game),
  FOREIGN KEY(jid) REFERENCES rpg_users(jid) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_rpg_game_sessions_expiry ON rpg_game_sessions(expires_at);
`)

const addOwnerStmt = db.prepare('INSERT OR IGNORE INTO owners (jid, added_at) VALUES (?, ?)')
const delOwnerStmt = db.prepare('DELETE FROM owners WHERE jid = ?')
const getOwnersStmt = db.prepare('SELECT jid FROM owners')
const logStmt = db.prepare('INSERT INTO usage (command, sender, created_at) VALUES (?, ?, ?)')

for (const owner of settings.owner) {
  const raw = String(owner || '').trim()
  if (!raw || /[xX]/.test(raw)) continue
  const clean = raw.replace(/\D/g, '')
  if (clean.length >= 6 && clean.length <= 15) addOwnerStmt.run(`${clean}@s.whatsapp.net`, Date.now())
}

export const database = {
  raw: db,
  addOwner(jid) {
    const value = String(jid || '').trim()
    const normalized = value.includes('@')
      ? value
      : `${value.replace(/\D/g, '')}@s.whatsapp.net`

    if (!normalized || normalized.startsWith('@')) return false

    addOwnerStmt.run(normalized, Date.now())
    return true
  },

  deleteOwner(jid) {
    const value = String(jid || '').trim()
    const normalized = value.includes('@')
      ? value
      : `${value.replace(/\D/g, '')}@s.whatsapp.net`

    return delOwnerStmt.run(normalized).changes > 0
  },

  getOwners() {
    return getOwnersStmt.all().map(row => row.jid)
  },

  isOwner(jids = []) {
    const owners = new Set(this.getOwners())

    return jids.some(jid => {
      if (!jid) return false

      const value = String(jid)

      if (owners.has(value)) return true

      const number = value.split('@')[0].replace(/\D/g, '')

      return [...owners].some(owner => {
        const ownerNumber = owner.split('@')[0].replace(/\D/g, '')
        return ownerNumber && number && ownerNumber === number &&
          value.endsWith('@s.whatsapp.net')
      })
    })
  },

  set(key, value) {
    db.prepare(`
      INSERT INTO settings (key, value)
      VALUES (?, ?)
      ON CONFLICT(key) DO UPDATE SET value=excluded.value
    `).run(key, JSON.stringify(value))
  },

  get(key, fallback = null) {
    const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(key)
    if (!row) return fallback

    try {
      return JSON.parse(row.value)
    } catch {
      return fallback
    }
  },

  log(command, sender) {
    logStmt.run(command, sender || '', Date.now())
  },

  close() {
    db.close()
  }
}

export default database

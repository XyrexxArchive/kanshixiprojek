import database from '../../lib/database.js'

const db = database.raw
const now = () => Date.now()
const dayKey = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta' }).format(new Date())
const fmt = n => Number(n || 0).toLocaleString('id-ID')
const rand = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min
const pick = list => list[Math.floor(Math.random() * list.length)]
const clamp = (n, min, max) => Math.max(min, Math.min(max, n))

const migrations = [
  ['class', "TEXT NOT NULL DEFAULT 'adventurer'"], ['mana', 'INTEGER NOT NULL DEFAULT 50'],
  ['max_mana', 'INTEGER NOT NULL DEFAULT 50'], ['stamina', 'INTEGER NOT NULL DEFAULT 100'],
  ['skill_points', 'INTEGER NOT NULL DEFAULT 0'], ['rebirth', 'INTEGER NOT NULL DEFAULT 0'],
  ['wins', 'INTEGER NOT NULL DEFAULT 0'], ['losses', 'INTEGER NOT NULL DEFAULT 0'],
  ['kills', 'INTEGER NOT NULL DEFAULT 0'], ['fish', 'INTEGER NOT NULL DEFAULT 0'],
  ['mines', 'INTEGER NOT NULL DEFAULT 0'], ['hunts', 'INTEGER NOT NULL DEFAULT 0']
]
const columns = new Set(db.prepare('PRAGMA table_info(rpg_users)').all().map(x => x.name))
for (const [name, definition] of migrations) if (!columns.has(name)) db.exec(`ALTER TABLE rpg_users ADD COLUMN ${name} ${definition}`)

db.exec(`
CREATE TABLE IF NOT EXISTS rpg_equipment (jid TEXT NOT NULL, slot TEXT NOT NULL, item TEXT NOT NULL, PRIMARY KEY(jid,slot), FOREIGN KEY(jid) REFERENCES rpg_users(jid) ON DELETE CASCADE);
CREATE TABLE IF NOT EXISTS rpg_pets (jid TEXT PRIMARY KEY, name TEXT NOT NULL, species TEXT NOT NULL, level INTEGER NOT NULL DEFAULT 1, exp INTEGER NOT NULL DEFAULT 0, bond INTEGER NOT NULL DEFAULT 50, FOREIGN KEY(jid) REFERENCES rpg_users(jid) ON DELETE CASCADE);
CREATE TABLE IF NOT EXISTS rpg_quest_progress (jid TEXT NOT NULL, quest_id TEXT NOT NULL, period TEXT NOT NULL, progress INTEGER NOT NULL DEFAULT 0, claimed INTEGER NOT NULL DEFAULT 0, PRIMARY KEY(jid,quest_id,period), FOREIGN KEY(jid) REFERENCES rpg_users(jid) ON DELETE CASCADE);
CREATE TABLE IF NOT EXISTS rpg_guilds (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL UNIQUE, leader TEXT NOT NULL, level INTEGER NOT NULL DEFAULT 1, exp INTEGER NOT NULL DEFAULT 0, treasury INTEGER NOT NULL DEFAULT 0, created_at INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS rpg_guild_members (jid TEXT PRIMARY KEY, guild_id INTEGER NOT NULL, role TEXT NOT NULL DEFAULT 'member', joined_at INTEGER NOT NULL, FOREIGN KEY(guild_id) REFERENCES rpg_guilds(id) ON DELETE CASCADE, FOREIGN KEY(jid) REFERENCES rpg_users(jid) ON DELETE CASCADE);
CREATE TABLE IF NOT EXISTS rpg_market (id INTEGER PRIMARY KEY AUTOINCREMENT, seller TEXT NOT NULL, item TEXT NOT NULL, amount INTEGER NOT NULL, price INTEGER NOT NULL, created_at INTEGER NOT NULL, FOREIGN KEY(seller) REFERENCES rpg_users(jid) ON DELETE CASCADE);
CREATE TABLE IF NOT EXISTS rpg_achievements (jid TEXT NOT NULL, achievement TEXT NOT NULL, unlocked_at INTEGER NOT NULL, PRIMARY KEY(jid,achievement), FOREIGN KEY(jid) REFERENCES rpg_users(jid) ON DELETE CASCADE);
CREATE TABLE IF NOT EXISTS rpg_dungeon_runs (jid TEXT PRIMARY KEY, floor INTEGER NOT NULL DEFAULT 1, hp INTEGER NOT NULL, started_at INTEGER NOT NULL, FOREIGN KEY(jid) REFERENCES rpg_users(jid) ON DELETE CASCADE);
CREATE TABLE IF NOT EXISTS rpg_transactions (id INTEGER PRIMARY KEY AUTOINCREMENT, jid TEXT NOT NULL, type TEXT NOT NULL, amount INTEGER NOT NULL, note TEXT, created_at INTEGER NOT NULL);
CREATE INDEX IF NOT EXISTS idx_rpg_market_created ON rpg_market(created_at);
CREATE INDEX IF NOT EXISTS idx_rpg_transactions_user ON rpg_transactions(jid, created_at);
`)

const items = {
  potion: { name: 'Health Potion', price: 180, type: 'consumable', heal: 55, desc: 'Pulihkan 55 HP' },
  superpotion: { name: 'Mega Potion', price: 420, type: 'consumable', heal: 140, desc: 'Pulihkan 140 HP' },
  ether: { name: 'Ether', price: 260, type: 'consumable', mana: 60, desc: 'Pulihkan 60 MP' },
  bread: { name: 'Roti Petualang', price: 65, type: 'consumable', hunger: 30, desc: 'Pulihkan hunger' },
  water: { name: 'Air Mineral', price: 35, type: 'consumable', thirst: 35, desc: 'Pulihkan thirst' },
  iron_sword: { name: 'Iron Sword', price: 950, type: 'weapon', atk: 8, slot: 'weapon', desc: '+8 ATK' },
  steel_sword: { name: 'Steel Sword', price: 2600, type: 'weapon', atk: 18, slot: 'weapon', desc: '+18 ATK' },
  mage_staff: { name: 'Apprentice Staff', price: 1800, type: 'weapon', atk: 10, mana: 20, slot: 'weapon', desc: '+10 ATK, +20 MP' },
  leather_armor: { name: 'Leather Armor', price: 800, type: 'armor', def: 6, slot: 'armor', desc: '+6 DEF' },
  knight_armor: { name: 'Knight Armor', price: 2800, type: 'armor', def: 17, slot: 'armor', desc: '+17 DEF' },
  lucky_ring: { name: 'Lucky Ring', price: 3200, type: 'accessory', luck: 5, slot: 'accessory', desc: '+5% drop chance' },
  pickaxe: { name: 'Pickaxe', price: 500, type: 'tool', desc: 'Alat mining' }, rod: { name: 'Fishing Rod', price: 450, type: 'tool', desc: 'Alat fishing' },
  bait: { name: 'Fishing Bait', price: 25, type: 'material', desc: 'Umpan ikan' }, seed: { name: 'Magic Seed', price: 50, type: 'material', desc: 'Bibit kebun' },
  wood: { name: 'Wood', price: 35, type: 'material' }, stone: { name: 'Stone', price: 40, type: 'material' }, iron: { name: 'Iron Ore', price: 95, type: 'material' }, gold: { name: 'Gold Ore', price: 240, type: 'material' }, diamond: { name: 'Diamond', price: 900, type: 'material' }, fish: { name: 'Fresh Fish', price: 90, type: 'material' }, rarefish: { name: 'Golden Fish', price: 450, type: 'material' }, hide: { name: 'Monster Hide', price: 120, type: 'material' }, crystal: { name: 'Mana Crystal', price: 300, type: 'material' }
}
const classes = {
  warrior: { name: 'Warrior', atk: 5, def: 7, hp: 30, mana: 0, skill: 'Power Strike' },
  mage: { name: 'Mage', atk: 9, def: 1, hp: 0, mana: 35, skill: 'Arcane Burst' },
  assassin: { name: 'Assassin', atk: 8, def: 2, hp: 5, mana: 10, skill: 'Shadow Slash' },
  tank: { name: 'Guardian', atk: 2, def: 10, hp: 45, mana: 0, skill: 'Iron Wall' },
  archer: { name: 'Archer', atk: 7, def: 3, hp: 10, mana: 10, skill: 'Piercing Arrow' }
}
const monsters = [
  { name: 'Green Slime', min: 1, hp: 45, atk: 8, def: 1, exp: 28, gold: 90, drops: ['hide', 'crystal'] },
  { name: 'Wild Wolf', min: 2, hp: 75, atk: 13, def: 3, exp: 45, gold: 150, drops: ['hide', 'meat'] },
  { name: 'Goblin Scout', min: 4, hp: 110, atk: 17, def: 5, exp: 65, gold: 220, drops: ['iron', 'wood'] },
  { name: 'Cave Bat', min: 6, hp: 145, atk: 21, def: 6, exp: 85, gold: 300, drops: ['crystal', 'hide'] },
  { name: 'Orc Berserker', min: 9, hp: 220, atk: 29, def: 9, exp: 130, gold: 480, drops: ['iron', 'gold'] },
  { name: 'Dark Knight', min: 14, hp: 340, atk: 39, def: 14, exp: 210, gold: 800, drops: ['gold', 'diamond'] },
  { name: 'Ancient Dragon', min: 22, hp: 620, atk: 55, def: 20, exp: 420, gold: 1800, drops: ['diamond', 'crystal'] }
]
const quests = [
  { id: 'hunt3', title: 'Monster Hunter', goal: 3, field: 'hunts', reward: 450, exp: 90, desc: 'Kalahkan 3 monster' },
  { id: 'work2', title: 'Honest Worker', goal: 2, field: 'work', reward: 300, exp: 55, desc: 'Selesaikan 2 pekerjaan' },
  { id: 'mine2', title: 'Miner', goal: 2, field: 'mines', reward: 350, exp: 65, desc: 'Lakukan mining 2 kali' },
  { id: 'fish3', title: 'Fisher', goal: 3, field: 'fish', reward: 320, exp: 60, desc: 'Tangkap 3 ikan' }
]
const getUser = jid => db.prepare('SELECT * FROM rpg_users WHERE jid=?').get(jid)
const count = (jid, item) => db.prepare('SELECT amount FROM rpg_inventory WHERE jid=? AND item=?').get(jid, item)?.amount || 0
function addItem(jid, item, amount = 1) {
  db.prepare(`INSERT INTO rpg_inventory(jid,item,amount) VALUES(?,?,?) ON CONFLICT(jid,item) DO UPDATE SET amount=MAX(0,amount+excluded.amount)`).run(jid, item, amount)
  db.prepare('DELETE FROM rpg_inventory WHERE jid=? AND amount<=0').run(jid)
}
function patch(jid, values) {
  const allowed = new Set(['name','class','level','exp','money','bank','hp','max_hp','mana','max_mana','energy','stamina','hunger','thirst','attack','defense','skill_points','rebirth','wins','losses','kills','fish','mines','hunts'])
  const entries = Object.entries(values).filter(([key]) => allowed.has(key))
  if (!entries.length) return
  db.prepare(`UPDATE rpg_users SET ${entries.map(([key]) => `${key}=@${key}`).join(',')} WHERE jid=@jid`).run({ jid, ...Object.fromEntries(entries) })
}
function logMoney(jid, type, amount, note = '') { db.prepare('INSERT INTO rpg_transactions(jid,type,amount,note,created_at) VALUES(?,?,?,?,?)').run(jid, type, amount, note, now()) }
function cooldown(jid, action, duration) {
  const row = db.prepare('SELECT until FROM rpg_cooldowns WHERE jid=? AND action=?').get(jid, action)
  if (row?.until > now()) return Math.ceil((row.until - now()) / 1000)
  db.prepare(`INSERT INTO rpg_cooldowns(jid,action,until) VALUES(?,?,?) ON CONFLICT(jid,action) DO UPDATE SET until=excluded.until`).run(jid, action, now() + duration)
  return 0
}
function exp(jid, amount) {
  let u = getUser(jid), gained = 0
  if (!u) return 0
  let xp = u.exp + amount, level = u.level, hp = u.max_hp, mana = u.max_mana, atk = u.attack, def = u.defense, points = u.skill_points
  while (xp >= level * 120) { xp -= level * 120; level++; hp += 12; mana += 5; atk += 2; def += 1; points += 2; gained++ }
  patch(jid, { exp: xp, level, max_hp: hp, hp: Math.min(hp, u.hp + gained * 12), max_mana: mana, mana: Math.min(mana, u.mana + gained * 5), attack: atk, defense: def, skill_points: points })
  return gained
}
function questProgress(jid, field, amount = 1) {
  const day = dayKey()
  const q = quests.find(x => x.field === field)
  if (!q) return
  db.prepare(`INSERT INTO rpg_quest_progress(jid,quest_id,period,progress) VALUES(?,?,?,?) ON CONFLICT(jid,quest_id,period) DO UPDATE SET progress=MIN(?,progress+excluded.progress)`).run(jid, q.id, day, amount, q.goal)
}
function unlock(jid, id, title) {
  const result = db.prepare('INSERT OR IGNORE INTO rpg_achievements(jid,achievement,unlocked_at) VALUES(?,?,?)').run(jid, id, now())
  return result.changes ? `\n🏅 Achievement unlocked: ${title}` : ''
}
function gearStats(jid) {
  const rows = db.prepare('SELECT e.slot,e.item FROM rpg_equipment e WHERE e.jid=?').all(jid)
  return rows.reduce((a, row) => { const it = items[row.item] || {}; a.atk += it.atk || 0; a.def += it.def || 0; a.mana += it.mana || 0; a.luck += it.luck || 0; return a }, { atk: 0, def: 0, mana: 0, luck: 0 })
}
function header(title, subtitle = 'KANSHIXI • ADVENTURE WORLD') { return `╭━━━〔 ${title} 〕━━━╮\n│ ${subtitle}\n╰━━━━━━━━━━━━━━━━━━╯` }
function bar(value, max, size = 12) { const filled = Math.round(clamp(value / Math.max(1, max), 0, 1) * size); return '▰'.repeat(filled) + '▱'.repeat(size - filled) }
function targetFrom(ctx) { return ctx.message?.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0] || ctx.message?.message?.extendedTextMessage?.contextInfo?.participant }

const FOOTER = '> *_Powered By Kanshixi_*'
const reply = (ctx, message, options) => ctx.reply(`${String(message)}\n\n${FOOTER}`, options)

const commandList = [
  'rpg','rpghelp','daftar','register','unregister','profile','profil','class','kelas','daily','weekly','work','rest','adventure','hunt','battle','boss','dungeon','explore','skill','heal','fish','fishing','mine','mining','farm','panen','shop','buy','sell','inventory','inv','use','equip','equipment','craft','quest','claim','leaderboard','toprpg','deposit','withdraw','transfer','pet','petname','petfeed','guild','market','sellmarket','buymarket','achievements','rebirth','upgrade'
]
export default {
  command: commandList,
  description: 'Kanshixi Adventure RPG • persistent SQLite system',
  async run(ctx) {
    const c = ctx.command, jid = ctx.sender, args = ctx.args, sub = (args[0] || '').toLowerCase()
    let u = getUser(jid)
    if (c === 'rpg' || c === 'rpghelp') return reply(ctx, [
      header('ADVENTURE RPG', 'A LIVING WORLD • SQLITE SAVED'),
      '│', '│  CHARACTER', '│  .daftar nama | .profile | .class', '│  .upgrade atk/def/hp | .rebirth',
      '│', '│  ADVENTURE', '│  .adventure | .hunt | .boss | .dungeon', '│  .skill | .heal | .rest | .daily | .weekly',
      '│', '│  LIFE & ECONOMY', '│  .work | .fish | .mine | .farm plant/harvest', '│  .shop | .buy | .sell | .craft | .use',
      '│  .deposit | .withdraw | .transfer @user',
      '│', '│  SOCIAL', '│  .pet adopt/name/feed | .guild create/join/info/transfer @user', '│  .market | .sellmarket | .buymarket',
      '│', '│  PROGRESSION', '│  .quest | .claim id | .achievements | .toprpg',
      '│', '└─ Semua progress tersimpan di SQLite.'
    ].join('\n'))
    if (c === 'daftar' || c === 'register') {
      if (u) return reply(ctx, 'Kamu sudah punya karakter. Gunakan .profile.')
      const name = (args.join(' ').trim() || ctx.pushName || 'Adventurer').replace(/[\r\n]/g, '').slice(0, 22)
      db.prepare('INSERT INTO rpg_users(jid,name,created_at) VALUES(?,?,?)').run(jid, name, now())
      addItem(jid, 'bread', 5); addItem(jid, 'water', 5); addItem(jid, 'potion', 2); addItem(jid, 'bait', 8)
      return reply(ctx, `${header('HUNTER LICENSE ISSUED', 'REGISTRATION COMPLETE')}\n│ Nama: ${name}\n│ Class: Adventurer\n│ Gold: 500\n│ Starter pack: 5 bread, 5 water, 2 potion\n│\n└─ Pilih class dengan .class warrior`)
    }
    if (c === 'unregister') {
      if (!u) return reply(ctx, 'Kamu belum terdaftar.')
      db.transaction(() => {
        const guild = db.prepare('SELECT guild_id,role FROM rpg_guild_members WHERE jid=?').get(jid)
        if (guild?.role === 'leader') db.prepare('DELETE FROM rpg_guilds WHERE id=?').run(guild.guild_id)
        const duels = db.prepare("SELECT jid,game,data FROM rpg_game_sessions WHERE game LIKE 'duel_%'").all()
        for (const duel of duels) {
          try { if (JSON.parse(duel.data).players.includes(jid)) db.prepare('DELETE FROM rpg_game_sessions WHERE jid=? AND game=?').run(duel.jid, duel.game) } catch {}
        }
        db.prepare('DELETE FROM rpg_game_sessions WHERE jid=?').run(jid)
        db.prepare('DELETE FROM rpg_cooldowns WHERE jid=?').run(jid)
        db.prepare('DELETE FROM rpg_transactions WHERE jid=?').run(jid)
        db.prepare('DELETE FROM rpg_users WHERE jid=?').run(jid)
      })()
      return reply(ctx, 'Karakter beserta data RPG terkait sudah dihapus.')
    }
    if (!u) return reply(ctx, 'Kamu belum punya karakter. Mulai dengan .daftar nama')

    if (c === 'profile' || c === 'profil') {
      const g = gearStats(jid), guild = db.prepare('SELECT g.name,m.role FROM rpg_guild_members m JOIN rpg_guilds g ON g.id=m.guild_id WHERE m.jid=?').get(jid)
      const need = u.level * 120
      return reply(ctx, [
        header(`${u.name.toUpperCase()} • LV ${u.level}`, `${classes[u.class]?.name || 'Adventurer'} CLASS • ${guild?.name || 'WANDERER'}`),
        `│ XP  ${bar(u.exp, need)} ${u.exp}/${need}`,
        `│ HP  ${bar(u.hp, u.max_hp)} ${u.hp}/${u.max_hp}`,
        `│ MP  ${bar(u.mana, u.max_mana)} ${u.mana}/${u.max_mana}`,
        `│ Energy ${u.energy}/100 • Stamina ${u.stamina}/100`,
        `│ Hunger ${u.hunger}/100 • Thirst ${u.thirst}/100`,
        '│', `│ ⚔ ATK ${u.attack + g.atk}  🛡 DEF ${u.defense + g.def}`,
        `│ Gold ${fmt(u.money)}  🏦 Bank ${fmt(u.bank)}`,
        `│ Wins ${u.wins} • Losses ${u.losses} • Kills ${u.kills}`,
        `│ Rebirth ${u.rebirth} • Skill points ${u.skill_points}`,
        `│ Guild ${guild ? `${guild.name} (${guild.role})` : 'None'}`,
        '└─ .equipment untuk detail gear'
      ].join('\n'))
    }
    if (c === 'class' || c === 'kelas') {
      if (!sub) return reply(ctx, `${header('CHOOSE YOUR CLASS')}\n${Object.entries(classes).map(([id,x]) => `│ ${id} — ${x.name}\n│ ATK +${x.atk} DEF +${x.def} HP +${x.hp} MP +${x.mana}\n│ Skill: ${x.skill}`).join('\n')}\n└─ .class warrior (sekali pilih, ganti class perlu rebirth)`)
      if (!classes[sub]) return reply(ctx, 'Class tidak tersedia. .class untuk daftar class.')
      if (u.level > 1 || u.class !== 'adventurer') return reply(ctx, 'Class hanya dapat dipilih sekali sebelum level 2. Ganti class melalui rebirth.')
      const cl = classes[sub]
      patch(jid, { class: sub, attack: u.attack + cl.atk, defense: u.defense + cl.def, max_hp: u.max_hp + cl.hp, hp: u.hp + cl.hp, max_mana: u.max_mana + cl.mana, mana: u.mana + cl.mana })
      return reply(ctx, `Class berhasil dipilih: ${cl.name}\nSkill utama: ${cl.skill}\nGunakan .skill saat battle.`)
    }
    if (c === 'daily' || c === 'weekly') {
      const key = c, ms = c === 'daily' ? 86400000 : 604800000, left = cooldown(jid, key, ms)
      if (left) return reply(ctx, `Reward ${c} tersedia dalam ${Math.ceil(left / 3600)} jam.`)
      const reward = c === 'daily' ? 350 + u.level * 85 : 2200 + u.level * 300
      patch(jid, { money: u.money + reward, energy: 100, stamina: 100, hunger: clamp(u.hunger + 25, 0, 100), thirst: clamp(u.thirst + 25, 0, 100) })
      logMoney(jid, c, reward, `${c} reward`); const lv = exp(jid, c === 'daily' ? 25 : 120)
      return reply(ctx, `${header(`${c.toUpperCase()} SUPPLY DROP`)}\n│ +${fmt(reward)} Gold\n│ +${c === 'daily' ? 25 : 120} EXP\n│ Energy & stamina restored\n└─ ${lv ? `LEVEL UP +${lv}` : 'Come back next time.'}`)
    }
    if (c === 'work') {
      const left = cooldown(jid, 'work', 90000); if (left) return reply(ctx, `Kamu masih istirahat ${left} detik.`)
      if (u.energy < 12 || u.hunger < 10) return reply(ctx, 'Energy/hunger tidak cukup. Gunakan .rest dan .use bread.')
      const reward = rand(110, 190) + u.level * 18
      patch(jid, { money: u.money + reward, energy: u.energy - 12, hunger: u.hunger - 5 })
      logMoney(jid, 'work', reward); questProgress(jid, 'work'); exp(jid, 18)
      return reply(ctx, `╭─〔 GUILD CONTRACT COMPLETE 〕\n│ Upah: +${fmt(reward)} Gold\n│ EXP: +18\n│ Energy: -12\n└─ Progress quest diperbarui.`)
    }
    if (c === 'rest') { patch(jid, { energy: 100, stamina: 100, hp: Math.min(u.max_hp, u.hp + 35), mana: Math.min(u.max_mana, u.mana + 25) }); return reply(ctx, 'Kamu beristirahat di inn. HP +35, MP +25, energy dan stamina pulih.') }
    if (c === 'adventure' || c === 'hunt' || c === 'battle' || c === 'boss') {
      const boss = c === 'boss'
      if (boss && u.level < 9) return reply(ctx, 'Boss hunt terbuka mulai level 9.')
      const left = cooldown(jid, boss ? 'boss' : 'hunt', boss ? 300000 : 35000)
      if (left) return reply(ctx, `Kamu perlu menunggu ${left} detik sebelum bertarung lagi.`)
      if (u.hp < 20 || u.energy < 12) return reply(ctx, 'HP atau energy kurang. Gunakan .rest / .use potion.')
      const pool = monsters.filter(m => m.min <= u.level && (!boss || m.hp >= 220))
      const m = pick(pool.length ? pool : monsters.slice(0, 1)), gear = gearStats(jid)
      let hp = u.hp, enemy = m.hp + (boss ? Math.floor(m.hp * .7) : 0), rounds = 0
      const playerAtk = u.attack + gear.atk, playerDef = u.defense + gear.def
      while (hp > 0 && enemy > 0 && rounds++ < 30) {
        enemy -= Math.max(1, playerAtk + rand(-3, 7) - m.def)
        if (enemy > 0) hp -= Math.max(1, m.atk + rand(-2, 5) - playerDef)
      }
      const won = hp > 0 && enemy <= 0
      if (won) {
        const gold = m.gold * (boss ? 2 : 1), xp = m.exp * (boss ? 2 : 1)
        patch(jid, { hp, energy: u.energy - 12, money: u.money + gold, wins: u.wins + 1, kills: u.kills + 1, hunts: u.hunts + 1 })
        logMoney(jid, 'battle', gold, m.name); const lv = exp(jid, xp); questProgress(jid, 'hunts')
        const drop = pick(m.drops); addItem(jid, drop, 1)
        let achievement = unlock(jid, 'first_blood', 'First Blood')
        if (u.kills + 1 >= 10) achievement += unlock(jid, 'slayer_10', 'Monster Slayer')
        return reply(ctx, `${header(won && boss ? 'BOSS DEFEATED' : 'VICTORY', 'COMBAT REPORT')}\n│ Enemy: ${m.name}${boss ? ' • BOSS' : ''}\n│ Enemy HP left: 0\n│ Your HP: ${hp}/${u.max_hp}\n│ Reward: +${fmt(gold)} Gold, +${xp} EXP\n│ Loot: 1x ${items[drop]?.name || drop}\n└─ ${lv ? `LEVEL UP +${lv}` : 'Keep hunting!'}${achievement}`)
      }
      patch(jid, { hp: 1, energy: u.energy - 12, losses: u.losses + 1 })
      return reply(ctx, `${header('DEFEAT', 'RETREAT REPORT')}\n│ ${m.name} terlalu kuat.\n│ Kamu berhasil kabur dengan 1 HP.\n└─ Upgrade equipment atau naikkan level dulu.`)
    }
    if (c === 'skill') {
      if (u.mana < 20) return reply(ctx, 'MP kurang. Gunakan .use ether atau .rest.')
      if (u.energy < 8) return reply(ctx, 'Energy kurang. .rest dahulu.')
      const left = cooldown(jid, 'skill', 25000)
      if (left) return reply(ctx, `Skill cooldown ${left} detik.`)
      const gear = gearStats(jid), skillName = classes[u.class]?.skill || 'Adventurer Strike'
      const enemy = pick(monsters.filter(m => m.min <= u.level))
      const damage = Math.max(1, (u.attack + gear.atk) * 3 + u.level * 5 + rand(8, 24) - enemy.def)
      const retaliation = Math.max(0, enemy.atk + rand(0, 5) - (u.defense + gear.def))
      const won = damage >= enemy.hp
      const hp = Math.max(1, u.hp - (won ? 0 : retaliation))
      const gold = won ? enemy.gold : 0, xp = won ? enemy.exp : 8
      patch(jid, { mana: u.mana - 20, energy: u.energy - 8, hp, money: u.money + gold, ...(won ? { wins: u.wins + 1, kills: u.kills + 1, hunts: u.hunts + 1 } : {}) })
      if (won) { logMoney(jid, 'skill_battle', gold, enemy.name); questProgress(jid, 'hunts'); addItem(jid, pick(enemy.drops), 1) }
      const lv = exp(jid, xp)
      return reply(ctx, `${header('CLASS SKILL EXECUTED', 'SPECIAL COMBAT')}\n│ Skill: ${skillName}\n│ Target: ${enemy.name} (${enemy.hp} HP)\n│ Skill damage: ${damage}\n│ Result: ${won ? 'ENEMY DEFEATED' : 'ENEMY SURVIVED'}\n│ MP -20 • Energy -8 • HP ${hp}/${u.max_hp}\n│ Reward: +${fmt(gold)} Gold • +${xp} EXP\n└─ ${lv ? `LEVEL UP +${lv}` : 'Skill cooldown: 25 seconds.'}`)
    }
    if (c === 'heal') {
      if (!count(jid, 'potion')) return reply(ctx, 'Potion habis. Beli di .shop')
      addItem(jid, 'potion', -1); patch(jid, { hp: Math.min(u.max_hp, u.hp + 55) }); return reply(ctx, 'Health Potion digunakan. HP +55.')
    }
    if (c === 'fish' || c === 'fishing' || c === 'mine' || c === 'mining') {
      const fishing = c === 'fish' || c === 'fishing', key = fishing ? 'fish' : 'mine', left = cooldown(jid, key, fishing ? 35000 : 50000)
      if (left) return reply(ctx, `Cooldown ${left} detik.`)
      if (!count(jid, fishing ? 'rod' : 'pickaxe')) return reply(ctx, `Kamu membutuhkan ${fishing ? '.buy rod' : '.buy pickaxe'}.`)
      if (u.energy < 10) return reply(ctx, 'Energy kurang. .rest')
      if (fishing && !count(jid, 'bait')) return reply(ctx, 'Umpan habis. .buy bait')
      const rare = Math.random() < .1, item = fishing ? (rare ? 'rarefish' : 'fish') : pick(['stone','stone','iron','gold','diamond','crystal'])
      addItem(jid, item, 1); if (fishing) addItem(jid, 'bait', -1)
      patch(jid, { energy: u.energy - 10, fish: u.fish + (fishing ? 1 : 0), mines: u.mines + (fishing ? 0 : 1) })
      questProgress(jid, fishing ? 'fish' : 'mines'); exp(jid, rare ? 32 : 16)
      return reply(ctx, `${header(fishing ? 'FISHING RESULT' : 'MINING RESULT')}\n│ Kamu mendapatkan: ${items[item]?.name || item}\n│ Rarity: ${rare || item === 'diamond' ? 'RARE' : 'COMMON'}\n└─ +16 EXP`)
    }
    if (c === 'farm' || c === 'panen') {
      if (sub === 'plant') {
        if (!count(jid, 'seed')) return reply(ctx, 'Bibit habis. Beli .buy seed')
        addItem(jid, 'seed', -1); db.prepare('INSERT INTO rpg_farms(jid,planted_at) VALUES(?,?)').run(jid, now()); return reply(ctx, 'Bibit ditanam. Panen tersedia setelah 10 menit: .farm harvest')
      }
      if (sub === 'harvest') {
        const farm = db.prepare('SELECT id,planted_at FROM rpg_farms WHERE jid=? ORDER BY id LIMIT 1').get(jid)
        if (!farm) return reply(ctx, 'Tidak ada tanaman. .farm plant')
        const wait = 600000 - (now() - farm.planted_at); if (wait > 0) return reply(ctx, `Tanaman belum matang. Tunggu ${Math.ceil(wait / 60000)} menit.`)
        db.prepare('DELETE FROM rpg_farms WHERE id=?').run(farm.id); const qty = rand(3, 7); addItem(jid, 'bread', qty); addItem(jid, 'seed', 1); exp(jid, 30); return reply(ctx, `Panen berhasil! ${qty}x Roti Petualang dan 1 bibit. +30 EXP.`)
      }
      return reply(ctx, '.farm plant — tanam bibit\n.farm harvest — panen tanaman')
    }
    if (c === 'shop') return reply(ctx, [header('ADVENTURER MARKET'), ...Object.entries(items).filter(([,x]) => x.price > 0).map(([id,x]) => `│ ${id.padEnd(14)} ${x.name} — ${fmt(x.price)}G${x.desc ? ` (${x.desc})` : ''}`), '└─ .buy item jumlah'].join('\n'))
    if (c === 'buy') {
      const id = sub, qty = clamp(Number(args[1]) || 1, 1, 99), it = items[id]
      if (!it || !it.price) return reply(ctx, 'Item tidak ditemukan. .shop')
      const total = it.price * qty; if (u.money < total) return reply(ctx, `Gold kurang. Butuh ${fmt(total)}G.`)
      db.transaction(() => { patch(jid, { money: u.money - total }); addItem(jid, id, qty); logMoney(jid, 'shop_buy', -total, id) })()
      return reply(ctx, `Purchase complete: ${qty}x ${it.name}\nTotal: ${fmt(total)} Gold.`)
    }
    if (c === 'inventory' || c === 'inv') {
      const rows = db.prepare('SELECT item,amount FROM rpg_inventory WHERE jid=? AND amount>0 ORDER BY item').all(jid)
      const gear = db.prepare('SELECT slot,item FROM rpg_equipment WHERE jid=?').all(jid)
      return reply(ctx, [header('BACKPACK'), '│ ITEMS', ...rows.map(x => `│ ${items[x.item]?.name || x.item} x${x.amount}  [${x.item}]`), '│', '│ EQUIPPED', ...gear.map(x => `│ ${x.slot}: ${items[x.item]?.name || x.item}`), '└─ .use item | .equip item'].join('\n'))
    }
    if (c === 'equipment') { const rows = db.prepare('SELECT slot,item FROM rpg_equipment WHERE jid=?').all(jid); return reply(ctx, [header('EQUIPMENT'), ...['weapon','armor','accessory'].map(slot => { const row = rows.find(x => x.slot === slot); return `│ ${slot}: ${row ? items[row.item]?.name || row.item : 'Empty'}` }), '└─ .equip iron_sword'].join('\n')) }
    if (c === 'equip') {
      const id = sub, it = items[id]; if (!it?.slot) return reply(ctx, 'Item tersebut bukan equipment.')
      if (!count(jid, id)) return reply(ctx, 'Item tidak ada di inventory.')
      db.transaction(() => { addItem(jid, id, -1); const old = db.prepare('SELECT item FROM rpg_equipment WHERE jid=? AND slot=?').get(jid, it.slot); if (old) addItem(jid, old.item, 1); db.prepare('INSERT INTO rpg_equipment(jid,slot,item) VALUES(?,?,?) ON CONFLICT(jid,slot) DO UPDATE SET item=excluded.item').run(jid, it.slot, id) })()
      return reply(ctx, `${it.name} dipasang pada slot ${it.slot}.`)
    }
    if (c === 'use') {
      const id = sub, it = items[id]; if (!it || !count(jid, id) || it.type !== 'consumable') return reply(ctx, 'Consumable tidak ditemukan.')
      addItem(jid, id, -1); patch(jid, { hp: Math.min(u.max_hp, u.hp + (it.heal || 0)), mana: Math.min(u.max_mana, u.mana + (it.mana || 0)), hunger: clamp(u.hunger + (it.hunger || 0), 0, 100), thirst: clamp(u.thirst + (it.thirst || 0), 0, 100) })
      return reply(ctx, `${it.name} digunakan. ${it.desc || 'Status diperbarui.'}`)
    }
    if (c === 'sell') {
      const id = sub, qty = clamp(Number(args[1]) || 1, 1, 999), it = items[id], owned = count(jid, id)
      if (!it || it.price <= 0 || owned < qty) return reply(ctx, 'Item tidak valid atau jumlah tidak cukup.')
      const value = Math.floor(it.price * .45) * qty; addItem(jid, id, -qty); patch(jid, { money: u.money + value }); logMoney(jid, 'sell', value, id); return reply(ctx, `Terjual ${qty}x ${it.name}. +${fmt(value)} Gold.`)
    }
    if (c === 'craft') {
      const recipes = { potion: { cost: { iron: 2, crystal: 1 }, out: 'potion', qty: 2 }, steel_sword: { cost: { iron: 8, wood: 3 }, out: 'steel_sword', qty: 1 }, ether: { cost: { crystal: 2, fish: 1 }, out: 'ether', qty: 2 } }
      const recipe = recipes[sub]; if (!recipe) return reply(ctx, `${header('CRAFTING RECIPES')}\n│ .craft potion — 2 iron + 1 crystal → 2 potion\n│ .craft steel_sword — 8 iron + 3 wood\n└─ .craft ether — 2 crystal + 1 fish`)
      if (Object.entries(recipe.cost).some(([id, amount]) => count(jid, id) < amount)) return reply(ctx, 'Material belum cukup untuk recipe ini.')
      db.transaction(() => { for (const [id, amount] of Object.entries(recipe.cost)) addItem(jid, id, -amount); addItem(jid, recipe.out, recipe.qty) })()
      exp(jid, 25); return reply(ctx, `Crafting sukses! ${recipe.qty}x ${items[recipe.out].name}. +25 EXP.`)
    }
    if (c === 'quest') {
      const day = dayKey()
      const lines = quests.map(q => { const row = db.prepare('SELECT progress,claimed FROM rpg_quest_progress WHERE jid=? AND quest_id=? AND period=?').get(jid, q.id, day); const p = row?.progress || 0; return `│ ${q.id} — ${q.title}\n│ ${q.desc}: ${p}/${q.goal} ${row?.claimed ? '✓ CLAIMED' : p >= q.goal ? '• READY: .claim ' + q.id : ''}` })
      return reply(ctx, [header('DAILY QUEST BOARD', day), ...lines, '└─ Reward klaim menggunakan .claim id'].join('\n'))
    }
    if (c === 'claim') {
      const id = sub, q = quests.find(x => x.id === id), day = dayKey()
      if (!q) return reply(ctx, 'Quest ID tidak ditemukan. .quest')
      const row = db.prepare('SELECT progress,claimed FROM rpg_quest_progress WHERE jid=? AND quest_id=? AND period=?').get(jid, id, day)
      if (!row || row.progress < q.goal || row.claimed) return reply(ctx, 'Quest belum selesai atau reward sudah diklaim.')
      db.prepare('UPDATE rpg_quest_progress SET claimed=1 WHERE jid=? AND quest_id=? AND period=?').run(jid, id, day)
      patch(jid, { money: u.money + q.reward }); logMoney(jid, 'quest', q.reward, id); exp(jid, q.exp); return reply(ctx, `Quest ${q.title} complete! +${fmt(q.reward)} Gold, +${q.exp} EXP.`)
    }
    if (c === 'leaderboard' || c === 'toprpg') { const rows = db.prepare('SELECT name,level,rebirth,money,kills FROM rpg_users ORDER BY rebirth DESC,level DESC,exp DESC LIMIT 10').all(); return reply(ctx, [header('HUNTER RANKING'), ...rows.map((x,i) => `│ ${i+1}. ${x.name} • R${x.rebirth} Lv.${x.level} • ${fmt(x.money)}G • ${x.kills} kills`), '└─ Keep grinding.'].join('\n')) }
    if (c === 'deposit' || c === 'withdraw') {
      const amount = Math.floor(Number(sub)); if (!Number.isSafeInteger(amount) || amount < 1) return reply(ctx, `Format: .${c} jumlah`)
      if (c === 'deposit' && u.money < amount) return reply(ctx, 'Wallet tidak cukup.')
      if (c === 'withdraw' && u.bank < amount) return reply(ctx, 'Saldo bank tidak cukup.')
      patch(jid, c === 'deposit' ? { money: u.money - amount, bank: u.bank + amount } : { money: u.money + amount, bank: u.bank - amount }); logMoney(jid, c, amount); return reply(ctx, `${c} ${fmt(amount)} Gold berhasil.`)
    }
    if (c === 'transfer') {
      const target = targetFrom(ctx), amount = Math.floor(Number(sub)); if (!target || target === jid) return reply(ctx, 'Reply atau tag penerima. .transfer jumlah')
      const other = getUser(target); if (!other) return reply(ctx, 'Penerima belum terdaftar RPG.')
      if (!Number.isSafeInteger(amount) || amount < 1 || amount > u.money) return reply(ctx, 'Jumlah transfer tidak valid atau saldo kurang.')
      db.transaction(() => { patch(jid, { money: u.money - amount }); patch(target, { money: other.money + amount }); logMoney(jid, 'transfer_out', -amount, target); logMoney(target, 'transfer_in', amount, jid) })()
      return reply(ctx, `Transfer ${fmt(amount)} Gold berhasil ke ${other.name}.`)
    }
    if (c === 'pet') {
      let pet = db.prepare('SELECT * FROM rpg_pets WHERE jid=?').get(jid)
      if (!pet && sub === 'adopt') { if (u.money < 1200) return reply(ctx, 'Adopsi pet membutuhkan 1.200 Gold.'); pet = { name: 'Mochi', species: pick(['Fox','Cat','Dragonling','Wolf Pup']) }; db.prepare('INSERT INTO rpg_pets(jid,name,species) VALUES(?,?,?)').run(jid, pet.name, pet.species); patch(jid, { money: u.money - 1200 }); return reply(ctx, `Pet berhasil diadopsi: ${pet.name} the ${pet.species}. Gunakan .pet untuk melihat status.`) }
      if (!pet) return reply(ctx, 'Kamu belum punya pet. .pet adopt')
      return reply(ctx, `${header('COMPANION STATUS')}\n│ ${pet.name} • ${pet.species}\n│ Level ${pet.level} • EXP ${pet.exp}/100\n│ Bond ${pet.bond}/100\n└─ .petname nama | .petfeed`)
    }
    if (c === 'petname') { const pet = db.prepare('SELECT * FROM rpg_pets WHERE jid=?').get(jid); if (!pet) return reply(ctx, 'Belum punya pet. .pet adopt'); const name = args.join(' ').trim().slice(0, 18); if (!name) return reply(ctx, 'Format: .petname nama'); db.prepare('UPDATE rpg_pets SET name=? WHERE jid=?').run(name, jid); return reply(ctx, `Nama pet diubah menjadi ${name}.`) }
    if (c === 'petfeed') { const pet = db.prepare('SELECT * FROM rpg_pets WHERE jid=?').get(jid); if (!pet) return reply(ctx, 'Belum punya pet. .pet adopt'); if (!count(jid, 'fish') && !count(jid, 'meat')) return reply(ctx, 'Butuh fish atau meat untuk memberi makan.'); const food = count(jid, 'fish') ? 'fish' : 'meat'; addItem(jid, food, -1); let petExp = pet.exp + 20, petLevel = pet.level; while (petExp >= petLevel * 100) { petExp -= petLevel * 100; petLevel++ } db.prepare('UPDATE rpg_pets SET bond=MIN(100,bond+15),exp=?,level=? WHERE jid=?').run(petExp, petLevel, jid); return reply(ctx, `${pet.name} senang! Bond +15, pet EXP +20.${petLevel > pet.level ? ` Pet naik ke level ${petLevel}!` : ''}`) }
    if (c === 'guild') {
      const action = sub || 'info', member = db.prepare('SELECT g.*,m.role FROM rpg_guild_members m JOIN rpg_guilds g ON g.id=m.guild_id WHERE m.jid=?').get(jid)
      if (action === 'create') { if (member) return reply(ctx, 'Kamu sudah tergabung guild.'); const name = args.slice(1).join(' ').trim().slice(0, 24); if (!name) return reply(ctx, '.guild create nama guild'); if (u.money < 5000) return reply(ctx, 'Membuat guild butuh 5.000 Gold.'); const id = db.prepare('INSERT INTO rpg_guilds(name,leader,created_at) VALUES(?,?,?)').run(name, jid, now()).lastInsertRowid; db.prepare('INSERT INTO rpg_guild_members(jid,guild_id,role,joined_at) VALUES(?,?,?,?)').run(jid, id, 'leader', now()); patch(jid, { money: u.money - 5000 }); return reply(ctx, `Guild ${name} berhasil dibuat!`) }
      if (action === 'join') { const name = args.slice(1).join(' ').trim(); const guild = db.prepare('SELECT * FROM rpg_guilds WHERE name=? COLLATE NOCASE').get(name); if (!guild) return reply(ctx, 'Guild tidak ditemukan.'); if (member) return reply(ctx, 'Keluar guild lama dulu.'); db.prepare('INSERT INTO rpg_guild_members(jid,guild_id,joined_at) VALUES(?,?,?)').run(jid, guild.id, now()); return reply(ctx, `Kamu bergabung dengan ${guild.name}.`) }
      if (action === 'transfer') { const target = targetFrom(ctx); if (!member || member.role !== 'leader') return reply(ctx, 'Hanya leader guild yang bisa transfer leadership.'); if (!target || target === jid) return reply(ctx, 'Tag anggota yang akan menjadi leader.'); const next = db.prepare('SELECT * FROM rpg_guild_members WHERE jid=? AND guild_id=?').get(target, member.id); if (!next) return reply(ctx, 'Target harus menjadi anggota guild yang sama.'); db.transaction(() => { db.prepare("UPDATE rpg_guild_members SET role='member' WHERE jid=?").run(jid); db.prepare("UPDATE rpg_guild_members SET role='leader' WHERE jid=?").run(target); db.prepare('UPDATE rpg_guilds SET leader=? WHERE id=?').run(target, member.id) })(); return reply(ctx, `Leadership guild ${member.name} berhasil dipindahkan.`) }
      if (action === 'leave') { if (!member) return reply(ctx, 'Kamu belum punya guild.'); if (member.role === 'leader') return reply(ctx, 'Leader harus transfer leadership dengan .guild transfer @anggota sebelum keluar.'); db.prepare('DELETE FROM rpg_guild_members WHERE jid=?').run(jid); return reply(ctx, 'Kamu keluar dari guild.') }
      if (action === 'donate') { const amount = Math.floor(Number(args[1])); if (!member || !Number.isSafeInteger(amount) || amount < 1 || amount > u.money) return reply(ctx, 'Format: .guild donate jumlah'); db.transaction(() => { patch(jid, { money: u.money - amount }); db.prepare('UPDATE rpg_guilds SET treasury=treasury+?,exp=exp+? WHERE id=?').run(amount, Math.floor(amount / 10), member.id); const guildState = db.prepare('SELECT level,exp FROM rpg_guilds WHERE id=?').get(member.id); let xp = guildState.exp, level = guildState.level; while (xp >= level * 1000) { xp -= level * 1000; level++ } db.prepare('UPDATE rpg_guilds SET level=?,exp=? WHERE id=?').run(level, xp, member.id) })(); return reply(ctx, `Donasi ${fmt(amount)} Gold masuk ke treasury ${member.name}.`) }
      if (action === 'list') { const rows = db.prepare('SELECT name,level,treasury FROM rpg_guilds ORDER BY level DESC LIMIT 10').all(); return reply(ctx, [header('GUILD DIRECTORY'), ...rows.map(x => `│ ${x.name} • Lv.${x.level} • ${fmt(x.treasury)}G`), '└─ .guild join nama'].join('\n')) }
      if (!member) return reply(ctx, 'Kamu belum punya guild. .guild list / .guild create nama')
      const total = db.prepare('SELECT COUNT(*) AS n FROM rpg_guild_members WHERE guild_id=?').get(member.id).n
      return reply(ctx, `${header('GUILD HALL')}\n│ ${member.name} • Level ${member.level}\n│ Role: ${member.role}\n│ Members: ${total}\n│ Treasury: ${fmt(member.treasury)}G\n└─ .guild donate jumlah | .guild leave`)
    }
    if (c === 'market') {
      if (sub === 'list' || !sub) { const rows = db.prepare('SELECT id,item,amount,price FROM rpg_market ORDER BY id DESC LIMIT 15').all(); return reply(ctx, [header('PLAYER MARKET'), ...rows.map(x => `│ #${x.id} ${items[x.item]?.name || x.item} x${x.amount} — ${fmt(x.price)}G`), '└─ .buymarket id | .sellmarket item qty harga'].join('\n')) }
      return reply(ctx, '.market list — lihat listing')
    }
    if (c === 'sellmarket') {
      const id = sub, qty = Math.floor(Number(args[1])), price = Math.floor(Number(args[2])); if (!items[id] || !Number.isSafeInteger(qty) || qty < 1 || qty > count(jid,id) || !Number.isSafeInteger(price) || price < 1) return reply(ctx, '.sellmarket item jumlah harga')
      addItem(jid, id, -qty); db.prepare('INSERT INTO rpg_market(seller,item,amount,price,created_at) VALUES(?,?,?,?,?)').run(jid,id,qty,price,now()); return reply(ctx, `Listing dibuat: ${qty}x ${id} seharga ${fmt(price)}G. .market list`)
    }
    if (c === 'buymarket') {
      const id = Number(sub), listing = db.prepare('SELECT * FROM rpg_market WHERE id=?').get(id); if (!listing || listing.seller === jid) return reply(ctx, 'Listing tidak ditemukan atau itu listing milikmu.'); if (u.money < listing.price) return reply(ctx, 'Gold tidak cukup.'); const seller = getUser(listing.seller)
      db.transaction(() => { patch(jid, { money: u.money - listing.price }); patch(listing.seller, { money: seller.money + listing.price }); addItem(jid, listing.item, listing.amount); db.prepare('DELETE FROM rpg_market WHERE id=?').run(id) })()
      return reply(ctx, `Berhasil membeli ${items[listing.item]?.name || listing.item} x${listing.amount} dari market.`)
    }
    if (c === 'achievements') { const rows = db.prepare('SELECT achievement,unlocked_at FROM rpg_achievements WHERE jid=? ORDER BY unlocked_at DESC').all(jid); return reply(ctx, [header('ACHIEVEMENT COLLECTION'), ...(rows.length ? rows.map(x => `│ 🏅 ${x.achievement}`) : ['│ Belum ada achievement.']), '└─ Terus main untuk membuka badge.'].join('\n')) }
    if (c === 'upgrade') {
      const stat = sub; if (!['atk','def','hp'].includes(stat)) return reply(ctx, '.upgrade atk/def/hp — gunakan skill point'); if (u.skill_points < 1) return reply(ctx, 'Skill point tidak cukup. Naikkan level.'); const key = stat === 'atk' ? 'attack' : stat === 'def' ? 'defense' : 'max_hp'; patch(jid, { [key]: u[key] + (stat === 'hp' ? 15 : 2), skill_points: u.skill_points - 1, ...(stat === 'hp' ? { hp: u.hp + 15 } : {}) }); return reply(ctx, `Upgrade ${stat.toUpperCase()} berhasil. Sisa skill point: ${u.skill_points - 1}.`)
    }
    if (c === 'rebirth') {
      if (u.level < 30) return reply(ctx, 'Rebirth tersedia mulai level 30.'); const ok = args[0] === 'confirm'; if (!ok) return reply(ctx, 'Rebirth akan reset level/EXP, class, dan equipment, tetapi memberi permanent bonus. Ketik .rebirth confirm untuk lanjut.'); patch(jid, { class: 'adventurer', level: 1, exp: 0, max_hp: 120 + u.rebirth * 10, hp: 120 + u.rebirth * 10, max_mana: 50, mana: 50, attack: 10 + u.rebirth * 2, defense: 5 + u.rebirth, rebirth: u.rebirth + 1, skill_points: 0 }); db.prepare('DELETE FROM rpg_equipment WHERE jid=?').run(jid); return reply(ctx, `REBIRTH ${u.rebirth + 1} COMPLETE! Permanent bonus meningkat. Pilih class baru dengan .class.`)
    }
    if (c === 'dungeon' || c === 'explore') {
      const run = db.prepare('SELECT * FROM rpg_dungeon_runs WHERE jid=?').get(jid)
      if (sub === 'enter' || !sub) { if (run) return reply(ctx, `Kamu masih di dungeon floor ${run.floor}. Gunakan .dungeon onward atau .dungeon exit`); if (u.level < 5) return reply(ctx, 'Dungeon terbuka mulai level 5.'); db.prepare('INSERT INTO rpg_dungeon_runs(jid,floor,hp,started_at) VALUES(?,1,?,?)').run(jid,u.hp,now()); return reply(ctx, `${header('ABYSS DUNGEON')}\n│ Kamu memasuki dungeon lantai 1.\n└─ .dungeon onward untuk lanjut.`) }
      if (!run) return reply(ctx, 'Kamu tidak sedang di dungeon. .dungeon enter')
      if (sub === 'exit') { db.prepare('DELETE FROM rpg_dungeon_runs WHERE jid=?').run(jid); return reply(ctx, 'Kamu keluar dari dungeon dengan selamat.') }
      if (sub === 'onward') { const floor = run.floor + 1, mobHp = 45 + floor * 28, damage = rand(8, 18) + floor * 2, playerDamage = u.attack + gearStats(jid).atk + rand(5, 15); const leftHp = run.hp - Math.max(1, damage - u.defense); if (leftHp <= 0) { db.prepare('DELETE FROM rpg_dungeon_runs WHERE jid=?').run(jid); patch(jid, { hp: 1, losses: u.losses + 1 }); return reply(ctx, `Dungeon run berakhir di floor ${run.floor}. Kamu tumbang dan dievakuasi dengan 1 HP.`) } const won = playerDamage >= mobHp; if (won) { const gold = floor * 100, xp = floor * 35; db.prepare('UPDATE rpg_dungeon_runs SET floor=?,hp=? WHERE jid=?').run(floor,leftHp,jid); patch(jid, { hp: leftHp, money: u.money + gold, wins: u.wins + 1, kills: u.kills + 1 }); exp(jid,xp); return reply(ctx, `FLOOR ${floor} CLEARED!\nEnemy HP ${mobHp} • Damage ${playerDamage}\nHP ${leftHp}/${u.max_hp}\nReward +${fmt(gold)}G +${xp} EXP\n.dungeon onward / .dungeon exit`) } db.prepare('UPDATE rpg_dungeon_runs SET hp=? WHERE jid=?').run(leftHp,jid); patch(jid,{hp:leftHp}); return reply(ctx, `Floor ${floor} monster masih berdiri. Damage ${playerDamage}/${mobHp}. HP kamu ${leftHp}. Coba lagi dengan .dungeon onward.`) }
      return reply(ctx, '.dungeon enter | .dungeon onward | .dungeon exit')
    }
  }
}

import database from '../../lib/database.js'

const db = database.raw

db.exec(`
CREATE TABLE IF NOT EXISTS rpg_arcade_profiles (
  jid TEXT PRIMARY KEY, level INTEGER NOT NULL DEFAULT 1, xp INTEGER NOT NULL DEFAULT 0,
  points INTEGER NOT NULL DEFAULT 0, played INTEGER NOT NULL DEFAULT 0,
  wins INTEGER NOT NULL DEFAULT 0, streak INTEGER NOT NULL DEFAULT 0,
  last_daily TEXT, FOREIGN KEY(jid) REFERENCES rpg_users(jid) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS rpg_arcade_quests (
  jid TEXT NOT NULL, day TEXT NOT NULL, played INTEGER NOT NULL DEFAULT 0,
  wins INTEGER NOT NULL DEFAULT 0, claimed INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY(jid,day), FOREIGN KEY(jid) REFERENCES rpg_users(jid) ON DELETE CASCADE
);
`)
const now = () => Date.now()
const dayKey = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta' }).format(new Date())
const cash = n => Number(n || 0).toLocaleString('id-ID')
const random = n => Math.floor(Math.random() * n)
const pick = a => a[random(a.length)]
const aliases = {
  game: 'game', games: 'game', game2: 'game2', game3: 'game3', game4: 'game4', gamehelp: 'gamehelp', jawab: 'jawab', move: 'move', gamestats: 'gamestats', gameprofile: 'gameprofile', gamequest: 'gamequest', gameclaim: 'gameclaim', gamerank: 'gamerank', genapganjil: 'genapganjil',
  tebakangka: 'tebakangka', angka: 'tebakangka',
  suit: 'suit', batu: 'suit', coinflip: 'coinflip', koin: 'coinflip',
  dadu: 'dadu', dice: 'dadu', slot: 'slot', roulette: 'roulette',
  tebakwarna: 'tebakwarna', warna: 'tebakwarna',
  tebakhewan: 'tebakhewan', hewan: 'tebakhewan',
  tebakbendera: 'tebakbendera', bendera: 'tebakbendera',
  math: 'math', matematika: 'math', anagram: 'anagram', susunkata: 'anagram',
  tebakkata: 'tebakkata', wordle: 'tebakkata', memory: 'memory', memor: 'memory',
  teka: 'teka', riddles: 'teka', quiz: 'quiz', trivia: 'quiz',
  cepat: 'cepat', typing: 'cepat', tictactoe: 'tictactoe', ttt: 'tictactoe',
  connect4: 'connect4', c4: 'connect4', blackjack: 'blackjack', bj: 'blackjack',
  highlow: 'highlow', hilo: 'highlow', lotre: 'lotre', lottery: 'lotre'
}

const games = [
  ['Tebak Angka', '.tebakangka', 'Tebak angka rahasia 1–20'],
  ['Suit', '.suit batu/kertas/gunting', 'Lawan bot dalam suit klasik'],
  ['Coin Flip', '.coinflip kepala/ekor', 'Prediksi sisi koin'],
  ['Genap Ganjil', '.genapganjil genap/ganjil', 'Prediksi hasil dadu'],
  ['Dice Roll', '.dadu', 'Lempar dua dadu dan kumpulkan skor'],
  ['Slot Machine', '.slot 100', 'Cari kombinasi jackpot'],
  ['Roulette', '.roulette merah 100', 'Prediksi warna roulette'],
  ['Tebak Warna', '.tebakwarna', 'Tebak warna rahasia'],
  ['Tebak Hewan', '.tebakhewan', 'Tebak hewan dari clue'],
  ['Tebak Bendera', '.tebakbendera', 'Tebak negara dari bendera'],
  ['Math Rush', '.math', 'Selesaikan soal matematika cepat'],
  ['Anagram', '.anagram', 'Susun huruf menjadi kata'],
  ['Word Guess', '.tebakkata', 'Tebak kata rahasia'],
  ['Memory Test', '.memory', 'Ingat urutan angka'],
  ['Riddle', '.teka', 'Pecahkan teka-teki'],
  ['Trivia Quiz', '.quiz', 'Uji pengetahuan umum'],
  ['Typing Race', '.cepat', 'Ketik kalimat secepat mungkin'],
  ['Tic Tac Toe', '.tictactoe @tag', 'Duel X dan O'],
  ['Connect Four', '.connect4 @tag', 'Duel susun empat'],
  ['Blackjack', '.blackjack 100', 'Dekati angka 21'],
  ['High Low', '.highlow', 'Prediksi kartu selanjutnya'],
  ['Daily Lottery', '.lotre', 'Ikuti undian harian']
]

const questions = {
  tebakhewan: [
    ['Aku punya belalai dan tubuh besar', 'gajah'], ['Aku dikenal sebagai raja hutan', 'singa'],
    ['Aku hewan belang hitam putih', 'zebra'], ['Aku bisa menirukan suara manusia', 'burung beo'],
    ['Aku mamalia yang bisa terbang', 'kelelawar'], ['Aku punya punuk', 'unta']
  ],
  tebakbendera: [
    ['🇮🇩', 'indonesia'], ['🇯🇵', 'jepang'], ['🇧🇷', 'brasil'], ['🇫🇷', 'prancis'],
    ['🇰🇷', 'korea selatan'], ['🇩🇪', 'jerman'], ['🇮🇹', 'italia'], ['🇨🇦', 'kanada'],
    ['🇦🇺', 'australia'], ['🇹🇭', 'thailand']
  ],
  teka: [
    ['Semakin diisi semakin ringan. Apakah aku?', 'balon'],
    ['Punya banyak gigi tapi tidak bisa menggigit', 'sisir'],
    ['Selalu naik tapi tidak pernah turun', 'umur'],
    ['Punya leher tapi tidak punya kepala', 'botol'],
    ['Bisa berjalan tanpa kaki', 'jam']
  ],
  quiz: [
    ['Planet terbesar di tata surya?', 'jupiter'], ['Samudra terluas di dunia?', 'pasifik'],
    ['Ibukota Jepang?', 'tokyo'], ['Hewan tercepat di darat?', 'cheetah'],
    ['Berapa sisi pada segitiga?', '3'], ['Gas yang diserap tumbuhan?', 'karbon dioksida'],
    ['Benua terbesar?', 'asia'], ['Lambang kimia air?', 'h2o']
  ]
}

const words = ['komputer', 'sekolah', 'matahari', 'kucing', 'kamera', 'sepeda', 'internet', 'bintang', 'kelinci', 'jendela']
const colors = ['merah', 'biru', 'hijau', 'kuning', 'ungu', 'oranye']
const getUser = jid => db.prepare('SELECT * FROM rpg_users WHERE jid=?').get(jid)
const getSession = (jid, game) => db.prepare('SELECT * FROM rpg_game_sessions WHERE jid=? AND game=?').get(jid, game)
const setSession = (jid, game, data, ttl = 120000) => db.prepare(`INSERT INTO rpg_game_sessions(jid,game,data,expires_at) VALUES(?,?,?,?) ON CONFLICT(jid,game) DO UPDATE SET data=excluded.data,expires_at=excluded.expires_at`).run(jid, game, JSON.stringify(data), now() + ttl)
const clearSession = (jid, game) => db.prepare('DELETE FROM rpg_game_sessions WHERE jid=? AND game=?').run(jid, game)
const addMoney = (jid, amount) => db.prepare('UPDATE rpg_users SET money=MAX(0,money+?) WHERE jid=?').run(amount, jid)
function addExp(jid, amount) {
  const user = getUser(jid)
  if (!user) return
  let exp = user.exp + amount, level = user.level, maxHp = user.max_hp, attack = user.attack, defense = user.defense, gained = 0
  while (exp >= level * 100) { exp -= level * 100; level++; maxHp += 10; attack += 2; defense++; gained++ }
  db.prepare('UPDATE rpg_users SET exp=?,level=?,max_hp=?,hp=MIN(max_hp,hp+?),attack=?,defense=? WHERE jid=?').run(exp, level, maxHp, gained * 10, attack, defense, jid)
}
function stat(jid, game, win, reward = 0) {
  db.prepare(`INSERT INTO rpg_game_stats(jid,game,played,wins,losses,reward) VALUES(?,?,1,?,?,?) ON CONFLICT(jid,game) DO UPDATE SET played=played+1,wins=wins+excluded.wins,losses=losses+excluded.losses,reward=reward+excluded.reward`).run(jid, game, win ? 1 : 0, win ? 0 : 1, reward)
  const profile = db.prepare('SELECT * FROM rpg_arcade_profiles WHERE jid=?').get(jid)
  if (!profile) db.prepare('INSERT OR IGNORE INTO rpg_arcade_profiles(jid) VALUES(?)').run(jid)
  const current = db.prepare('SELECT * FROM rpg_arcade_profiles WHERE jid=?').get(jid)
  let xp = current.xp + (win ? 30 : 12), level = current.level
  while (xp >= level * 100) { xp -= level * 100; level++ }
  db.prepare('UPDATE rpg_arcade_profiles SET xp=?,level=?,points=points+?,played=played+1,wins=wins+?,streak=CASE WHEN ?=1 THEN streak+1 ELSE 0 END WHERE jid=?').run(xp, level, reward + (win ? 25 : 5), win ? 1 : 0, win ? 1 : 0, jid)
  const day = dayKey()
  db.prepare(`INSERT INTO rpg_arcade_quests(jid,day,played,wins) VALUES(?,?,1,?) ON CONFLICT(jid,day) DO UPDATE SET played=played+1,wins=wins+excluded.wins`).run(jid, day, win ? 1 : 0)
}
const normalize = s => String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().replace(/\s+/g, ' ')
const FOOTER = '> *_Powered By Kanshixi_*'
const reply = (ctx, text, options) => ctx.reply(`${String(text)}\n\n${FOOTER}`, options)

async function showMenu(ctx, pageIndex = 0) {
  const pageSize = 8
  const page = games.slice(pageIndex * pageSize, (pageIndex + 1) * pageSize)
  const lines = [
    `╭━━〔 KANSHIXI ARCADE • ${pageIndex + 1}/3 〕━━╮`,
    '│ 22+ GAME MODES • PERSISTENT STATS',
    '├────────────────────────',
    ...page.map(([name, command, desc], index) => `│ ${pageIndex * pageSize + index + 1}. ${name}\n│    ${desc}\n│    ${command}`),
    '├────────────────────────',
    '│ .gameprofile — level & arcade points',
    '│ .gamequest — misi harian arcade',
    '│ .gameclaim — klaim hadiah misi',
    '│ .gamerank — leaderboard arcade',
    '│ .gamestats — statistik personal',
    '│ .jawab <jawaban> — jawab game aktif',
    '│ .move <posisi> — langkah duel',
    pageIndex > 0 ? `│ .game${pageIndex} — halaman sebelumnya` : '',
    (pageIndex + 1) * pageSize < games.length ? `│ .game${pageIndex + 2} — halaman berikutnya` : '',
    '╰━━━━━━━━━━━━━━━━━━━━━━━━╯'
  ].filter(Boolean)
  return reply(ctx, lines.join('\n'))
}

function startQuestion(ctx, game, question, answer, prompt) {
  setSession(ctx.sender, game, { answer: normalize(answer), question })
  return reply(ctx, `${prompt}\n\nJawab dengan: .jawab <jawaban>\nAtau langsung ketik command game lagi dengan jawaban.`)
}

export default {
  command: Object.keys(aliases),
  description: '22 Mini Games dengan reward, session, dan statistik SQLite',
  async run(ctx) {
    const jid = ctx.sender
    const command = aliases[ctx.command] || ctx.command
    const user = getUser(jid)
    if (['game', 'gamehelp', 'game2', 'game3', 'game4'].includes(command)) return showMenu(ctx, ({ game2: 1, game3: 2, game4: 2 })[command] || 0)
    if (command === 'gamestats') {
      const rows = db.prepare('SELECT game,played,wins,losses,reward FROM rpg_game_stats WHERE jid=? ORDER BY played DESC').all(jid)
      return reply(ctx, rows.length ? ['📊 GAME STATS', '', ...rows.map(x => `${x.game}: ${x.wins} menang / ${x.losses} kalah (${x.played} main) • reward $${cash(x.reward)}`)].join('\n') : 'Belum ada statistik game.')
    }
    if (command === 'gameprofile') {
      if (!user) return reply(ctx, 'Daftar RPG dulu dengan .daftar nama.')
      const p = db.prepare('SELECT * FROM rpg_arcade_profiles WHERE jid=?').get(jid) || { level: 1, xp: 0, points: 0, played: 0, wins: 0, streak: 0 }
      return reply(`╭━━〔 ARCADE PLAYER CARD 〕━━╮\n│ Level: ${p.level} • XP: ${p.xp}/${p.level * 100}\n│ Arcade Points: ${cash(p.points)}\n│ Played: ${p.played} • Wins: ${p.wins}\n│ Win streak: ${p.streak}\n╰━━━━━━━━━━━━━━━━━━━━╯\n.gamequest untuk misi harian.`)
    }
    if (command === 'gamequest') {
      if (!user) return reply(ctx, 'Daftar RPG dulu dengan .daftar nama.')
      const day = dayKey()
      const q = db.prepare('SELECT * FROM rpg_arcade_quests WHERE jid=? AND day=?').get(jid, day) || { played: 0, wins: 0, claimed: 0 }
      return reply(`╭━━〔 DAILY ARCADE QUEST 〕━━╮\n│ Mainkan 3 game: ${Math.min(3,q.played)}/3\n│ Menangkan 2 game: ${Math.min(2,q.wins)}/2\n│ Reward: 500 Gold + 100 Arcade Points\n│ Status: ${q.claimed ? 'CLAIMED' : q.played >= 3 && q.wins >= 2 ? 'READY • .gameclaim' : 'IN PROGRESS'}\n╰━━━━━━━━━━━━━━━━━━━━╯`)
    }
    if (command === 'gameclaim') {
      if (!user) return reply(ctx, 'Daftar RPG dulu dengan .daftar nama.')
      const day = dayKey()
      const q = db.prepare('SELECT * FROM rpg_arcade_quests WHERE jid=? AND day=?').get(jid, day)
      if (!q || q.played < 3 || q.wins < 2 || q.claimed) return reply(ctx, 'Misi belum selesai atau sudah diklaim. Cek .gamequest.')
      db.prepare('UPDATE rpg_arcade_quests SET claimed=1 WHERE jid=? AND day=?').run(jid, day)
      db.prepare('UPDATE rpg_users SET money=money+500 WHERE jid=?').run(jid)
      db.prepare('UPDATE rpg_arcade_profiles SET points=points+100 WHERE jid=?').run(jid)
      return reply('DAILY ARCADE QUEST COMPLETE!\n+500 Gold\n+100 Arcade Points\nBesok ada misi baru.')
    }
    if (command === 'gamerank') {
      const rows = db.prepare(`SELECT p.level,p.points,p.wins,u.name FROM rpg_arcade_profiles p JOIN rpg_users u ON u.jid=p.jid ORDER BY p.points DESC,p.level DESC LIMIT 10`).all()
      return reply(['╭━━〔 ARCADE HALL OF FAME 〕━━╮', ...rows.map((x,i) => `│ ${i+1}. ${x.name} • Lv.${x.level} • ${cash(x.points)} pts • ${x.wins} wins`), '╰━━━━━━━━━━━━━━━━━━━━━━━━╯'].join('\n'))
    }
    if (command === 'move') return playDuelMove(ctx)
    if (command === 'jawab') {
      const session = db.prepare('SELECT game,data,expires_at FROM rpg_game_sessions WHERE jid=? ORDER BY expires_at DESC LIMIT 1').get(jid)
      if (!session || session.expires_at < now()) return reply(ctx, 'Tidak ada game aktif. Ketik .game untuk mulai.')
      const data = JSON.parse(session.data)
      return handleAnswer(ctx, session.game, data, ctx.args.join(' '))
    }
    if (!user) return reply(ctx, 'Daftar RPG dulu dengan .daftar agar reward game tersimpan ke SQLite.')
    if (['tebakwarna','tebakhewan','tebakbendera','teka','quiz','math','anagram','tebakkata','memory','cepat'].includes(command) && ctx.args.length) {
      const active = getSession(jid, command)
      if (active && active.expires_at > now()) return handleAnswer(ctx, command, JSON.parse(active.data), ctx.args.join(' '))
    }
    if (command === 'tebakangka') {
      let s = getSession(jid, command)
      if (!s) { const answer = 1 + random(20); setSession(jid, command, { answer }); return reply(ctx, '🎯 Tebak angka dari 1 sampai 20. Gunakan .jawab angka atau .tebakangka angka') }
      if (ctx.args[0]) return handleAnswer(ctx, command, JSON.parse(s.data), ctx.args.join(' '))
      return reply(ctx, 'Game sedang berjalan. Jawab dengan .jawab angka.')
    }
    if (command === 'suit') {
      const choice = normalize(ctx.args[0]); if (!['batu', 'kertas', 'gunting'].includes(choice)) return reply(ctx, 'Format: .suit batu/kertas/gunting')
      const bot = pick(['batu', 'kertas', 'gunting']); const win = choice !== bot && ((choice === 'batu' && bot === 'gunting') || (choice === 'kertas' && bot === 'batu') || (choice === 'gunting' && bot === 'kertas'))
      const draw = choice === bot; const reward = win ? 80 : 0; if (win) addMoney(jid, reward); stat(jid, command, win || draw, reward)
      return reply(ctx, `Kamu: ${choice}\nBot: ${bot}\n${draw ? 'SERI!' : win ? `MENANG! +$${cash(reward)}` : 'KALAH!'} `)
    }
    if (command === 'coinflip') {
      const choice = normalize(ctx.args[0]); if (!['kepala', 'ekor'].includes(choice)) return reply(ctx, 'Format: .coinflip kepala/ekor')
      const result = pick(['kepala', 'ekor']); const win = choice === result; const reward = win ? 100 : 0; if (win) addMoney(jid, reward); stat(jid, command, win, reward)
      return reply(ctx, `🪙 Hasil: ${result}\n${win ? `Tebakan benar! +$${cash(reward)}` : 'Belum beruntung.'}`)
    }
    if (command === 'genapganjil') {
      const guess = normalize(ctx.args[0]); if (!['genap', 'ganjil'].includes(guess)) return reply(ctx, 'Format: .genapganjil genap/ganjil')
      const value = 1 + random(6), result = value % 2 ? 'ganjil' : 'genap', win = guess === result, reward = win ? 100 : 0
      if (reward) addMoney(jid, reward); stat(jid, command, win, reward)
      return reply(ctx, `🎲 Dadu: ${value} (${result})\n${win ? `Benar! +$${cash(reward)}` : 'Belum tepat.'}`)
    }
    if (command === 'dadu') {
      const a = 1 + random(6), b = 1 + random(6), total = a + b, reward = total === 12 ? 300 : total >= 9 ? 100 : 0
      if (reward) addMoney(jid, reward); stat(jid, command, reward > 0, reward)
      return reply(ctx, `🎲 Dadu: ${a} + ${b} = ${total}\n${reward ? `Bonus +$${cash(reward)}` : 'Coba lagi!'}`)
    }
    if (command === 'slot') {
      const bet = Math.max(10, Math.min(5000, Number(ctx.args[0]) || 100)); if (user.money < bet) return reply(ctx, 'Saldo tidak cukup.')
      const symbols = ['🍒', '🍋', '🔔', '⭐', '💎']; const result = [pick(symbols), pick(symbols), pick(symbols)]; const match = result.every(x => x === result[0]); const pair = new Set(result).size === 2; const prize = match ? bet * (result[0] === '💎' ? 10 : 5) : pair ? bet * 2 : 0
      addMoney(jid, prize - bet); stat(jid, command, prize > bet, prize - bet); return reply(ctx, `${result.join(' | ')}\n${prize > bet ? `JACKPOT! Untung $${cash(prize - bet)}` : prize ? `Menang $${cash(prize - bet)}` : `Kalah $${cash(bet)}`}`)
    }
    if (command === 'roulette') {
      const color = normalize(ctx.args[0]); const bet = Math.max(10, Math.min(5000, Number(ctx.args[1]) || 100)); if (!['merah', 'hitam'].includes(color)) return reply(ctx, 'Format: .roulette merah/hitam [taruhan]')
      if (user.money < bet) return reply(ctx, 'Saldo tidak cukup.')
      const result = pick(['merah', 'hitam', 'hijau']); const win = color === result; const prize = win ? bet * 2 : 0; addMoney(jid, prize - bet); stat(jid, command, win, prize - bet)
      return reply(ctx, `Roulette: ${result.toUpperCase()}\n${win ? `Menang +$${cash(bet)}` : `Kalah -$${cash(bet)}`}`)
    }
    if (command === 'tebakwarna') { const q = pick(colors); return startQuestion(ctx, command, 'Warna apa yang sedang dipikirkan bot?', q, '🎨 Tebak warna: merah, biru, hijau, kuning, ungu, atau oranye?') }
    if (command === 'tebakhewan' || command === 'tebakbendera' || command === 'teka' || command === 'quiz') {
      const [q, a] = pick(questions[command]); const prompt = command === 'tebakbendera' ? `Bendera ${q} adalah negara apa?` : q
      return startQuestion(ctx, command, q, a, `🧠 ${prompt}`)
    }
    if (command === 'math') {
      const a = 2 + random(30), b = 2 + random(20), op = pick(['+', '-', 'x']); const answer = op === '+' ? a + b : op === '-' ? a - b : a * b
      return startQuestion(ctx, command, `${a} ${op} ${b} = ?`, String(answer), `🔢 Hitung cepat: ${a} ${op} ${b} = ?`)
    }
    if (command === 'anagram') {
      const word = pick(words); const scrambled = word.split('').sort(() => Math.random() - .5).join('')
      return startQuestion(ctx, command, word, word, `🔤 Susun huruf ini: *${scrambled}*`)
    }
    if (command === 'tebakkata') {
      const word = pick(['apel', 'buku', 'meja', 'awan', 'pintu', 'musik', 'mobil', 'rumah'])
      return startQuestion(ctx, command, word, word, `📝 Tebak kata 4–5 huruf. Petunjuk: kata ini memiliki ${word.length} huruf dan sering dijumpai sehari-hari.`)
    }
    if (command === 'memory') {
      const seq = Array.from({ length: 5 }, () => random(10)).join(' '); setSession(jid, command, { answer: seq.replaceAll(' ', ''), display: seq }, 60000)
      return reply(ctx, `🧩 Hafalkan angka ini selama 10 detik:\n\n*${seq}*\n\nSetelah itu jawab urutannya tanpa spasi: .jawab <angka>`)
    }
    if (command === 'cepat') {
      const sentence = pick(['kanshixi bot makin keren', 'aku suka bermain mini games', 'sqlite menyimpan semua progres', 'semangat mencapai level tertinggi'])
      return startQuestion(ctx, command, sentence, sentence, `⌨️ Ketik kalimat ini dengan tepat:\n\n*${sentence}*`)
    }
    if (command === 'tictactoe' || command === 'connect4') return startDuel(ctx, command)
    if (command === 'blackjack') {
      const bet = Math.max(10, Math.min(5000, Number(ctx.args[0]) || 100)); if (user.money < bet) return reply(ctx, 'Saldo tidak cukup.')
      const player = 12 + random(10), dealer = 14 + random(8); const win = player <= 21 && (dealer > 21 || player > dealer); const draw = player === dealer; const delta = win ? bet : draw ? 0 : -bet
      addMoney(jid, delta); stat(jid, command, win || draw, delta); return reply(ctx, `🃏 Kamu: ${player}\nDealer: ${dealer}\n${win ? `MENANG +$${cash(bet)}` : draw ? 'SERI!' : `KALAH -$${cash(bet)}`}`)
    }
    if (command === 'highlow') {
      const active = getSession(jid, command)
      if (active && ctx.args[0]) return handleAnswer(ctx, command, JSON.parse(active.data), ctx.args.join(' '))
      const first = 1 + random(13); setSession(jid, command, { first, answer: first }, 60000)
      return reply(ctx, `🂠 Kartu pertama: ${first}\nTebak kartu berikutnya lebih tinggi atau rendah: .highlow tinggi/rendah`)
    }
    if (command === 'lotre') {
      if (getSession(jid, 'lotre')?.expires_at > now()) return reply(ctx, 'Kamu sudah ikut undian hari ini.')
      const number = String(100 + random(900));
      let draw = getSession('system', 'lotre_draw')
      if (!draw || draw.expires_at <= now()) { const winning = String(100 + random(900)); setSession('system', 'lotre_draw', { winning }, 86400000); draw = getSession('system', 'lotre_draw') }
      const winning = JSON.parse(draw.data).winning; const win = number === winning; const reward = win ? 5000 : 50
      addMoney(jid, reward); stat(jid, command, win, reward); setSession(jid, 'lotre', { number, winning }, 86400000)
      return reply(ctx, `🎟️ Nomor kamu: *${number}*\nNomor undian: *${winning}*\n${win ? 'JACKPOT +$5.000!' : `Hadiah partisipasi +$${cash(reward)}`}`)
    }
  }
}

async function handleAnswer(ctx, game, data, input) {
  const jid = ctx.sender
  const answer = normalize(input)
  const correct = answer === normalize(data.answer)
  if (game === 'highlow') {
    const next = 1 + random(13); const guess = answer; const win = (guess === 'tinggi' && next > data.first) || (guess === 'rendah' && next < data.first)
    clearSession(jid, game); const reward = win ? 120 : 0; if (reward) addMoney(jid, reward); stat(jid, game, win, reward)
    return reply(ctx, `Kartu berikutnya: ${next}\n${win ? `Benar! +$${cash(reward)}` : 'Tebakan salah.'}`)
  }
  if (!correct) return reply(ctx, `❌ Belum tepat. Coba lagi!\nPertanyaan: ${data.question || data.display || 'Game aktif'}`)
  clearSession(jid, game); const reward = game === 'memory' || game === 'cepat' ? 150 : 100; addMoney(jid, reward); stat(jid, game, true, reward)
  addExp(jid, 10)
  return reply(ctx, `🎉 BENAR!\nReward: +$${cash(reward)} dan +10 EXP.`)
}

async function startDuel(ctx, game) {
  const jid = ctx.sender
  const target = ctx.message?.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0] || ctx.message?.message?.extendedTextMessage?.contextInfo?.participant
  if (!target || target === jid) return reply(ctx, `Tag lawan dengan format .${game} @tag`)
  const other = getUser(target); if (!other) return reply(ctx, 'Lawan harus daftar RPG dulu.')
  const board = game === 'tictactoe' ? '---------': '000000000000000000000000000000000000000000'
  const data = { players: [jid, target], turn: jid, board }
  db.prepare('INSERT INTO rpg_game_sessions(jid,game,data,expires_at) VALUES(?,?,?,?) ON CONFLICT(jid,game) DO UPDATE SET data=excluded.data,expires_at=excluded.expires_at').run(jid, `duel_${game}`, JSON.stringify(data), now() + 300000)
  return reply(ctx, `⚔️ ${game.toUpperCase()} dimulai!\nPemain pertama: @${jid.split('@')[0]}\nGunakan .move posisi (1-${game === 'tictactoe' ? 9 : 7})\nLawan: @${target.split('@')[0]}`, { mentions: [jid, target] })
}


async function playDuelMove(ctx) {
  const jid = ctx.sender
  const pos = Number(ctx.args[0])
  const gameNames = ['tictactoe', 'connect4']
  let game = null
  let session = null
  for (const candidate of gameNames) {
    const rows = db.prepare('SELECT jid,data,expires_at FROM rpg_game_sessions WHERE game=?').all(`duel_${candidate}`)
    const row = rows.find(item => item.expires_at > now() && JSON.parse(item.data).players.includes(jid))
    if (row) { game = candidate; session = { ...row, data: JSON.parse(row.data) }; break }
  }
  if (!session) return reply(ctx, 'Kamu tidak punya duel aktif.')
  const data = session.data
  if (data.turn !== jid) return reply(ctx, 'Belum giliran kamu.')
  const max = game === 'tictactoe' ? 9 : 7
  if (!Number.isInteger(pos) || pos < 1 || pos > max) return reply(ctx, `Posisi harus 1 sampai ${max}.`)
  const board = data.board.split('')
  if (game === 'tictactoe') {
    if (board[pos - 1] !== '-') return reply(ctx, 'Kotak sudah terisi.')
    const mark = data.players[0] === jid ? 'X' : 'O'
    board[pos - 1] = mark
    const lines = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]]
    const won = lines.some(line => line.every(i => board[i] === mark))
    const draw = !won && board.every(x => x !== '-')
    if (won || draw) {
      db.prepare('DELETE FROM rpg_game_sessions WHERE jid=? AND game=?').run(session.jid, 'duel_tictactoe')
      if (won) { addMoney(jid, 250); stat(jid, game, true, 250); stat(data.players[0] === jid ? data.players[1] : data.players[0], game, false, 0) }
      return reply(ctx, `HASIL ${game.toUpperCase()}\n${board.map((x,i) => x === '-' ? String(i + 1) : x).join(' | ').match(/.{1,3}/g).join('\n')}\n${won ? `Pemenang: ${mark} (+$250)` : 'Seri!'}`)
    }
    data.board = board.join(''); data.turn = data.players.find(x => x !== jid)
    db.prepare('UPDATE rpg_game_sessions SET data=?,expires_at=? WHERE jid=? AND game=?').run(JSON.stringify(data), now() + 300000, session.jid, 'duel_tictactoe')
    return reply(ctx, `TIC TAC TOE\n${board.map((x,i) => x === '-' ? String(i + 1) : x).join(' | ').match(/.{1,3}/g).join('\n')}\nGiliran: @${data.turn.split('@')[0]}`, { mentions: [data.turn] })
  }
  if (board[pos - 1] !== '0') return reply(ctx, 'Kolom penuh.')
  const mark = data.players[0] === jid ? 'X' : 'O'
  let placed = false
  for (let row = 5; row >= 0; row--) {
    const index = row * 7 + pos - 1
    if (board[index] === '0') { board[index] = mark; placed = true; break }
  }
  if (!placed) return reply(ctx, 'Kolom penuh.')
  const won = hasConnectFour(board, mark)
  const draw = !won && board.every(x => x !== '0')
  if (won || draw) {
    db.prepare('DELETE FROM rpg_game_sessions WHERE jid=? AND game=?').run(session.jid, 'duel_connect4')
    if (won) { addMoney(jid, 400); stat(jid, game, true, 400); stat(data.players.find(x => x !== jid), game, false, 0) }
    return reply(ctx, `CONNECT FOUR\n${board.map(x => x === '0' ? '·' : x).join('').match(/.{1,7}/g).join('\n')}\n${won ? `Pemenang ${mark}! +$400` : 'Seri!'}`)
  }
  data.board = board.join(''); data.turn = data.players.find(x => x !== jid)
  db.prepare('UPDATE rpg_game_sessions SET data=?,expires_at=? WHERE jid=? AND game=?').run(JSON.stringify(data), now() + 300000, session.jid, 'duel_connect4')
  return reply(ctx, `CONNECT FOUR\n${board.map(x => x === '0' ? '·' : x).join('').match(/.{1,7}/g).join('\n')}\nGiliran: @${data.turn.split('@')[0]}\nPilih kolom .move 1-7`, { mentions: [data.turn] })
}

function hasConnectFour(board, mark) {
  for (let r = 0; r < 6; r++) for (let c = 0; c < 7; c++) {
    if (board[r * 7 + c] !== mark) continue
    for (const [dr, dc] of [[0,1],[1,0],[1,1],[1,-1]]) {
      let ok = true
      for (let k = 1; k < 4; k++) {
        const nr = r + dr * k, nc = c + dc * k
        if (nr < 0 || nr >= 6 || nc < 0 || nc >= 7 || board[nr * 7 + nc] !== mark) { ok = false; break }
      }
      if (ok) return true
    }
  }
  return false
}

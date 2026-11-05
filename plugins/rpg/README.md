# Kanshixi Adventure RPG

RPG persistent berbasis SQLite untuk Kanshixi. Tidak membutuhkan button; seluruh navigasi memakai command teks.

## Mulai

- `.daftar nama` — buat karakter
- `.rpg` — pusat bantuan RPG
- `.class` — pilih class Warrior, Mage, Assassin, Guardian, atau Archer
- `.profile` — status karakter

## Adventure & progression

- `.adventure` / `.hunt` — battle monster sesuai level
- `.boss` — pertarungan boss dengan cooldown
- `.dungeon enter|onward|exit` — dungeon bertingkat
- `.skill` — skill class berbasis MP
- `.upgrade atk|def|hp` — alokasikan skill point
- `.rebirth` — reset progression setelah level 30 dengan bonus permanen
- `.quest` / `.claim <id>` — quest harian dan reward
- `.achievements` / `.toprpg` — koleksi badge dan ranking

## Life & economy

- `.daily`, `.weekly`, `.work`, `.rest`
- `.fish`, `.mine`, `.farm plant|harvest`
- `.shop`, `.buy <item> <jumlah>`, `.sell <item> <jumlah>`
- `.inventory`, `.equipment`, `.equip <item>`, `.use <item>`, `.craft <recipe>`
- `.deposit <jumlah>`, `.withdraw <jumlah>`, `.transfer <jumlah>` (reply/tag penerima)

## Social

- `.pet adopt`, `.pet`, `.petname <nama>`, `.petfeed`
- `.guild create <nama>`, `.guild list`, `.guild join <nama>`, `.guild info`, `.guild donate <jumlah>`, `.guild transfer @anggota`, `.guild leave`
- `.market list`, `.sellmarket <item> <jumlah> <harga>`, `.buymarket <id>`

## Database

Plugin membuat tabel tambahan secara otomatis pada database Kanshixi yang sama (`settings.database`). Data karakter lama dipertahankan; kolom baru ditambahkan dengan migrasi `ALTER TABLE` yang aman. Jangan hapus file SQLite saat update jika ingin mempertahankan progress.

## Notes

Semua menu RPG dan mini games berupa teks. RPG memakai `better-sqlite3` yang sudah menjadi dependency project. Jalankan `npm run check` setelah update.


## Branding

Semua balasan RPG, arcade, dan menu utama menampilkan footer `> *_Powered By Kanshixi_*`.

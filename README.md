Kanshixi

<p align="center">
  <b>Modern WhatsApp Bot Framework</b><br>
  Hybrid Case & Plugin System
</p><p align="center">
  <img src="https://img.shields.io/badge/Node.js-22%2B-339933?logo=node.js&logoColor=white" />
  <img src="https://img.shields.io/badge/JavaScript-ESM-F7DF1E?logo=javascript&logoColor=black" />
  <img src="https://img.shields.io/badge/Database-SQLite-003B57?logo=sqlite&logoColor=white" />
  <img src="https://img.shields.io/badge/Architecture-Hybrid-blue" />
</p>Kanshixi adalah framework WhatsApp Bot berbasis Node.js dan Baileys yang dirancang dengan sistem modular, performa ringan, dan struktur yang mudah dikembangkan.

Kanshixi menggabungkan dua sistem command, yaitu Case System dan Plugin System, ke dalam satu handler menggunakan konsep Hybrid Architecture.

Dengan sistem ini, developer dapat membuat fitur melalui "case.js" maupun plugin terpisah tanpa harus mengubah keseluruhan source code.

---

Features

- Hybrid Case & Plugin System — Menggabungkan dua sistem command.
- Automatic Plugin Loader — Memuat plugin secara otomatis.
- Hot Reload — Reload plugin dan case tanpa restart penuh.
- Pairing Code — Menghubungkan WhatsApp menggunakan nomor telepon.
- SQLite Database — Penyimpanan data menggunakan SQLite.
- LID & JID Support — Mendukung identitas WhatsApp.
- Auto Reconnect — Menghubungkan kembali ketika koneksi terputus.
- Group Management — Fitur administrasi grup.
- Scraper Modules — Modul scraper terpisah.
- Command Cooldown — Pengaturan jeda command.
- Interactive Message Support — Mendukung fitur pesan interaktif sesuai library.
- RPG System — Sistem permainan dan penyimpanan progres.

---

Hybrid Case & Plugin System

Kanshixi memiliki dua sistem command yang saling terintegrasi.

Case System

Case System merupakan sistem command utama yang menggunakan "switch-case".

File:

case.js

Contoh:

export default async function runCase(ctx) {
  switch (ctx.command) {
    case 'hello':
      await ctx.reply('Hello from Kanshixi!')
      return true

    case 'ping':
      await ctx.reply('Pong!')
      return true

    default:
      return false
  }
}

Keterangan:

Return| Fungsi
"true"| Command berhasil ditangani
"false"| Command tidak ditemukan

Plugin System

Plugin System memungkinkan developer membuat command secara terpisah menggunakan file JavaScript.

Folder:

plugins/

Contoh plugin:

export default {
  command: ['hello', 'hi'],
  description: 'Hello command',
  owner: false,
  group: false,
  private: false,

  async run(ctx) {
    await ctx.reply('Hello from Plugin!')
  }
}

Plugin Properties

Property| Description
"command"| Nama command dan alias
"description"| Deskripsi command
"owner"| Membatasi command untuk owner
"group"| Membatasi penggunaan di grup
"private"| Membatasi penggunaan di chat pribadi
"run(ctx)"| Fungsi utama plugin

Hybrid Handler Flow

Plugin diperiksa terlebih dahulu. Jika command tidak ditemukan, handler meneruskannya ke Case System.

       Incoming Message
               |
               v
        Message Handler
               |
               v
         Command Parser
               |
               v
         Plugin Handler
               |
        +------+------+
        |             |
      Found        Not Found
        |             |
        v             v
    Run Plugin    Case Handler
                      |
                +-----+-----+
                |           |
             Found       Not Found
                |           |
                v           v
             Run Case   Unknown Command

Command Priority: Plugin memiliki prioritas lebih tinggi daripada Case apabila terdapat nama command yang sama.

---

Project Structure

kanshixi/
│
├── _auth/
│   ├── connect.js
│   └── pairing.js
│
├── lib/
│   ├── database.js
│   ├── function.js
│   ├── handler.js
│   ├── logger.js
│   ├── message.js
│   └── reloader.js
│
├── plugins/
│   ├── group/
│   │   ├── group.js
│   │   └── tagall.js
│   │
│   ├── owner/
│   │   ├── addplugin.js
│   │   ├── addscrape.js
│   │   ├── delplugin.js
│   │   ├── plugins.js
│   │   └── reload.js
│   │
│   ├── rpg/
│   │   ├── games.js
│   │   ├── rpg.js
│   │   ├── GAMES.md
│   │   └── README.md
│   │
│   ├── tools/
│   │   ├── cekidch.js
│   │   ├── get.js
│   │   ├── photolive.js
│   │   ├── pin.js
│   │   ├── ping.js
│   │   ├── rstc.js
│   │   ├── tiktok.js
│   │   └── tourl.js
│   │
│   └── README.md
│
├── scrape/
│   ├── pinterest.js
│   ├── tiktok.js
│   ├── top4top.js
│   └── README.md
│
├── thumbnail/
│   └── image.jpg
│
├── case.js
├── index.js
├── settings.js
├── package.json
└── README.md

---

Installation

1. Download Project

Download Kanshixi langsung dari repository GitHub ini.

1. Buka repository Kanshixi.
2. Klik tombol Code.
3. Pilih Download ZIP.
4. Tunggu sampai file selesai diunduh.

2. Upload to Hosting

Upload file ZIP Kanshixi ke hosting atau server yang mendukung Node.js.

Platform yang dapat digunakan:

- VPS
- Pterodactyl Panel
- Node.js Hosting
- Server pribadi

Setelah upload selesai, extract file ZIP ke direktori project.

3. Install Dependencies

Buka Terminal atau Console hosting, kemudian jalankan:

npm install

Tunggu sampai semua dependencies berhasil diinstall.

4. Start Bot

Jalankan Kanshixi menggunakan:

npm start

5. Connect WhatsApp

Setelah bot berjalan:

1. Tunggu pairing code muncul di console.
2. Buka aplikasi WhatsApp.
3. Masuk ke Perangkat Tertaut.
4. Pilih Tautkan dengan nomor telepon.
5. Masukkan pairing code yang muncul di console.

Jika berhasil, Kanshixi akan terhubung ke WhatsApp.

Requirements

Requirement| Version
Node.js| 22+
npm| Included with Node.js
Internet| Required
Hosting| Node.js Supported

Important: Gunakan Node.js versi 22 atau lebih baru. Versi di bawah Node.js 22 tidak didukung.

Jangan menghapus folder "_auth/" atau file database karena dapat menghilangkan session dan data bot.

---

Configuration

Konfigurasi bot dapat disesuaikan melalui:

settings.js

Atur nama bot, owner, nomor pairing, prefix, mode, dan konfigurasi lainnya sesuai kebutuhan.

Pastikan nomor owner menggunakan format internasional tanpa tanda "+".

Contoh:

6281234567890

---

Command Management

Berikut beberapa command pengelolaan bot:

Command| Description
".menu"| Menampilkan menu utama
".ping"| Mengecek respons bot
".runtime"| Informasi runtime
".owner"| Menampilkan kontak owner
".self"| Mengaktifkan mode self
".public"| Mengaktifkan mode public
".addowner"| Menambahkan owner
".delowner"| Menghapus owner
".listowner"| Melihat daftar owner
".plugins"| Melihat daftar plugin
".addplugin"| Menambahkan plugin
".delplugin"| Menghapus plugin
".addscrape"| Menambahkan scraper
".reload"| Reload file project

Catatan: Beberapa command hanya dapat digunakan oleh owner.

Plugin Management

Menambahkan plugin:

.addplugin tools/hello.js

Reply pesan yang berisi source code plugin.

Menghapus plugin:

.delplugin tools/hello.js

Melihat daftar plugin:

.plugins

Reload plugin:

.reload plugins

Reload satu plugin:

.reload plugins/tools/hello.js

Case Management

Reload Case System:

.reload case.js

Scraper Management

Menambahkan scraper:

.addscrape pinterest.js

Atau:

.addscrape downloader/tiktok.js

Reply pesan yang berisi source code scraper.

---

Context API

Setiap plugin dan case menerima object "ctx".

Property| Description
"ctx.sock"| Socket WhatsApp
"ctx.message"| Raw message
"ctx.jid"| ID chat
"ctx.sender"| ID pengirim
"ctx.senderCandidates"| Kandidat JID/LID
"ctx.pushName"| Nama pengirim
"ctx.text"| Isi pesan
"ctx.command"| Nama command
"ctx.args"| Argument command
"ctx.body"| Isi argument
"ctx.prefix"| Prefix aktif
"ctx.isCommand"| Status command
"ctx.isGroup"| Status grup
"ctx.isOwner"| Status owner
"ctx.fromMe"| Pesan dari bot sendiri
"ctx.reply()"| Membalas pesan
"ctx.send()"| Mengirim pesan
"ctx.react()"| Memberikan reaction
"ctx.mention()"| Mengirim mention
"ctx.checkGroupAdmin()"| Memeriksa admin grup
"ctx.log()"| Mencatat penggunaan command

Context Example

export default {
  command: ['info'],

  async run(ctx) {
    await ctx.reply(
      `Hello ${ctx.pushName}!\n` +
      `Sender: ${ctx.sender}\n` +
      `Group: ${ctx.isGroup}`
    )
  }
}

---

Scraper Modules

Folder "scrape/" digunakan untuk menyimpan scraper secara terpisah dari sistem utama.

Contoh struktur:

scrape/
├── pinterest.js
├── tiktok.js
└── top4top.js

Contoh export function:

export async function search(query) {
  return {
    status: true,
    result: []
  }
}

Scraper dapat dipanggil dari plugin menggunakan import ESM.

---

Database

Kanshixi menggunakan SQLite melalui "better-sqlite3".

Database digunakan untuk menyimpan berbagai data, seperti:

- Owner.
- Konfigurasi bot.
- Command usage.
- RPG users.
- RPG inventory.
- RPG cooldown.
- RPG farming.
- RPG game sessions.
- RPG statistics.

Session autentikasi dan database harus dijaga agar data bot tetap aman.

---

Baileys Documentation

Kanshixi menggunakan package "baileys" yang diarahkan ke fork Elaina Baileys.

Berikut beberapa dokumentasi untuk developer:

Documentation| Link
Elaina Baileys NPM| "NPM Package" (https://www.npmjs.com/package/@rexxhayanasi/elaina-baileys)
Elaina Baileys Repository| "GitHub" (https://github.com/rexxhayanasi/elaina-baileys)
Official Baileys| "GitHub" (https://github.com/WhiskeySockets/Baileys)
Official Wiki| "Baileys Wiki" (https://baileys.wiki)
Quick Start| "Getting Started" (https://baileys.wiki/docs/intro/)
API Reference| "API Documentation" (https://baileys.wiki/docs/api/)

Note: Dokumentasi official Baileys dapat digunakan sebagai referensi dasar. Namun, beberapa fitur dan API mungkin berbeda pada fork Elaina Baileys yang digunakan Kanshixi.

---

Development

Developer dapat mengembangkan Kanshixi dengan menambahkan plugin, case, maupun scraper.

Direkomendasikan menggunakan Plugin System untuk membuat fitur baru agar struktur project tetap modular.

Teknologi yang digunakan:

- Node.js
- JavaScript ESM
- Baileys
- SQLite
- Dynamic Plugin Loader

---

Security

Beberapa hal yang perlu diperhatikan:

- Jangan membagikan file session.
- Jangan mengunggah database autentikasi ke repository publik.
- Jangan menjalankan plugin dari sumber yang tidak dipercaya.
- Batasi akses command owner.
- Lindungi akses terhadap terminal dan server.

Contoh ".gitignore":

node_modules/
_auth/*.sqlite
*.sqlite
*.sqlite-shm
*.sqlite-wal
.env

---

Disclaimer

Kanshixi merupakan project independen yang menggunakan library WhatsApp tidak resmi.

Project ini tidak berafiliasi, disponsori, atau didukung secara resmi oleh WhatsApp maupun Meta Platforms, Inc.

Developer dan pengguna bertanggung jawab atas penggunaan project ini.

---

Credits

Project: Kanshixi
Developer / Author: xyrcodex / dapsganteng
Language: JavaScript (ESM)
Runtime: Node.js 22+
WhatsApp Library: Elaina Baileys
Database: SQLite
Architecture: Hybrid Case & Plugin System

---

<p align="center">
  <b>KANSHIXI</b><br>
  Hybrid Case & Plugin System<br><br>
  Developed by <b>xyrcodex / dapsganteng</b>
</p>
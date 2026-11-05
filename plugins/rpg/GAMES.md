# Kanshixi Arcade System

Arcade system uses the same RPG account and SQLite database configured in `settings.js`. All menus are plain text; no menu buttons are used. Every RPG/arcade reply ends with `> *_Powered By Kanshixi_*`.

## Menus & arcade profile

- `.game` — page 1
- `.game2` — page 2
- `.game3` — page 3
- `.gamestats` — personal statistics per game
- `.gameprofile` — arcade level, XP, points, wins and streak
- `.gamequest` — daily arcade challenge (play 3 games and win 2)
- `.gameclaim` — claim daily challenge reward
- `.gamerank` — arcade hall of fame

## 22 game modes

| Command | Mode |
| --- | --- |
| `.tebakangka` | Tebak angka 1–20 |
| `.suit batu/kertas/gunting` | Suit vs bot |
| `.coinflip kepala/ekor` | Coin flip |
| `.genapganjil genap/ganjil` | Dice parity |
| `.dadu` | Two dice roll |
| `.slot [bet]` | Slot machine |
| `.roulette merah/hitam [bet]` | Roulette |
| `.tebakwarna` | Tebak warna |
| `.tebakhewan` | Tebak hewan dari clue |
| `.tebakbendera` | Tebak negara dari bendera |
| `.math` | Math rush |
| `.anagram` | Susun kata |
| `.tebakkata` | Word guess |
| `.memory` | Memory sequence |
| `.teka` | Riddle |
| `.quiz` | Trivia |
| `.cepat` | Typing race |
| `.tictactoe @tag` | Multiplayer Tic Tac Toe |
| `.connect4 @tag` | Multiplayer Connect Four |
| `.blackjack [bet]` | Blackjack |
| `.highlow tinggi/rendah` | High Low cards |
| `.lotre` | Daily lottery |

Question games are answered with `.jawab <jawaban>`. Multiplayer turns use `.move <posisi>`. All games require RPG registration and save session/statistics/rewards to SQLite.

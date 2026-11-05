import chalk from 'chalk'
import settings from '../settings.js'

const line = chalk.gray('────────────────────────────────────────────────────────')
const stamp = () => chalk.gray(new Date().toLocaleTimeString('id-ID', { hour12: false, timeZone: settings.timezone || 'Asia/Jakarta' }))
const tag = (name, color='cyan') => chalk[color].bold(`[ ${name} ]`)
const clip = (value, max=180) => {
  const text = String(value ?? '').replace(/\s+/g, ' ').trim()
  return text.length > max ? `${text.slice(0, max - 1)}…` : text
}

export function banner() {
  console.log()
  console.log(chalk.cyan.bold('  ██╗  ██╗ █████╗ ███╗   ██╗███████╗██╗  ██╗██╗██╗'))
  console.log(chalk.cyan.bold('  ██║ ██╔╝██╔══██╗████╗  ██║██╔════╝██║  ██║██║██║'))
  console.log(chalk.cyan.bold('  █████╔╝ ███████║██╔██╗ ██║███████╗███████║██║██║'))
  console.log(chalk.cyan.bold('  ██╔═██╗ ██╔══██║██║╚██╗██║╚════██║██╔══██║██║██║'))
  console.log(chalk.cyan.bold('  ██║  ██╗██║  ██║██║ ╚████║███████║██║  ██║██║███████╗'))
  console.log(chalk.cyan.bold('  ╚═╝  ╚═╝╚═╝  ╚═╝╚═╝  ╚═══╝╚══════╝╚═╝  ╚═╝╚═╝╚══════╝'))
  console.log(chalk.gray(`  ${settings.namebot}  •  v${settings.version}  •  ${process.version}`))
  console.log(chalk.gray(`  Developer: ${settings.author}  •  Mode: ${settings.mode}  •  Prefix: ${settings.prefix || 'none'}`))
  console.log(line)
}

export const log = {
  info: (message, detail='') => console.log(`${stamp()} ${tag('INFO')} ${message}${detail ? chalk.gray(` ${detail}`) : ''}`),
  success: (message, detail='') => console.log(`${stamp()} ${tag('READY', 'green')} ${message}${detail ? chalk.gray(` ${detail}`) : ''}`),
  warn: (message, detail='') => console.log(`${stamp()} ${tag('WARN', 'yellow')} ${message}${detail ? chalk.gray(` ${detail}`) : ''}`),
  error: (message, error='') => console.log(`${stamp()} ${tag('ERROR', 'red')} ${message}${error ? chalk.red(` ${clip(error, 260)}`) : ''}`),
  event: (name, detail='') => console.log(`${stamp()} ${tag(name, 'magenta')} ${detail}`),
  message: ({ from, jid, chat, text, command }) => {
    console.log()
    console.log(`${stamp()} ${tag('MESSAGE', 'blue')} ${chalk.white.bold(clip(from || 'Unknown', 40))}`)
    console.log(`             ${chalk.gray('From:')} ${chalk.cyan(clip(jid, 64))}`)
    console.log(`             ${chalk.gray('Chat:')} ${chalk.white(clip(chat || jid, 64))}`)
    if (command) console.log(`             ${chalk.gray('Command:')} ${chalk.yellow.bold(command)}`)
    console.log(`             ${chalk.gray('Text:')} ${chalk.white(clip(text || '[non-text message]', 220))}`)
  },
  divider: () => console.log(line)
}

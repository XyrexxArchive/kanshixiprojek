import fs from 'node:fs/promises'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

let caseRevision = Date.now()

export function resolveProjectFile(input) {
  const raw = String(input || '').trim().replace(/\\/g, '/')

  if (!raw || raw.startsWith('/') || !raw.endsWith('.js')) {
    throw new Error('Path harus berupa file .js relatif, contoh: lib/helper.js')
  }

  const parts = raw.split('/')

  if (parts.some(part => !part || part === '.' || part === '..')) {
    throw new Error('Path tidak valid.')
  }

  const absolute = path.resolve(process.cwd(), raw)
  const relative = path.relative(process.cwd(), absolute)

  if (
    !relative ||
    relative.startsWith('..') ||
    path.isAbsolute(relative) ||
    relative.split(path.sep).includes('node_modules')
  ) {
    throw new Error('Path di luar folder project tidak diizinkan.')
  }

  return {
    absolute,
    relative: relative.split(path.sep).join('/')
  }
}

export async function reloadProjectFile(input) {
  const { absolute, relative } = resolveProjectFile(input)

  const stat = await fs.stat(absolute).catch(() => null)

  if (!stat?.isFile()) {
    throw new Error(`File tidak ditemukan: ${relative}`)
  }

  if (relative === 'index.js') {
    throw new Error('index.js adalah entry point. Restart bot untuk menerapkan perubahan.')
  }

  if (relative === 'case.js') {
    const mod = await import(
      `${pathToFileURL(absolute).href}?reload=${Date.now()}`
    )

    if (typeof mod.default !== 'function') {
      throw new Error('Export default case.js harus berupa function.')
    }

    caseRevision = Date.now()

    return {
      relative,
      type: 'case'
    }
  }

  await import(`${pathToFileURL(absolute).href}?reload=${Date.now()}`)

  return {
    relative,
    type: relative.startsWith('plugins/')
      ? 'plugin'
      : 'module'
  }
}

export async function getCaseHandler() {
  const file = path.resolve(process.cwd(), 'case.js')

  const mod = await import(
    `${pathToFileURL(file).href}?runtime=${caseRevision}`
  )

  return mod.default
}
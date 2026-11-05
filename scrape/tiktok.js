import axios from 'axios'
import * as cheerio from 'cheerio'

const BASE_URL = 'https://ssstik.io'

const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:125.0) Gecko/20100101 Firefox/125.0',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4.1 Safari/605.1.15'
]

const TIMEOUT = 30000

function normalizeUrl(input) {
  const value = String(input || '').trim()

  if (!value) throw new Error('URL TikTok wajib diisi.')

  const normalized = value.replace(
    /^(?:https?:\/\/)?(?:www\.)?tt\.site\/(?:t\/)?/i,
    'https://vt.tiktok.com/'
  )

  let parsed

  try {
    parsed = new URL(
      /^https?:\/\//i.test(normalized)
        ? normalized
        : `https://${normalized}`
    )
  } catch {
    throw new Error('Format URL tidak valid.')
  }

  const hostname = parsed.hostname.toLowerCase()

  const validHost =
    hostname === 'tiktok.com' ||
    hostname.endsWith('.tiktok.com') ||
    hostname === 'tt.site' ||
    hostname.endsWith('.tt.site')

  if (!validHost) {
    throw new Error('URL harus berasal dari TikTok.')
  }

  if (!['http:', 'https:'].includes(parsed.protocol)) {
    throw new Error('Protocol URL tidak didukung.')
  }

  return parsed.href
}

function createClient() {
  const userAgent =
    USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)]

  const cookies = new Map()

  const client = axios.create({
    baseURL: BASE_URL,
    timeout: TIMEOUT,
    maxRedirects: 5,
    headers: {
      'User-Agent': userAgent,
      Referer: `${BASE_URL}/id`,
      Origin: BASE_URL,
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
    }
  })

  client.interceptors.response.use(response => {
    const setCookie = response.headers['set-cookie'] || []

    for (const item of setCookie) {
      const cookie = item.split(';')[0]
      const index = cookie.indexOf('=')

      if (index > 0) {
        cookies.set(
          cookie.slice(0, index),
          cookie.slice(index + 1)
        )
      }
    }

    return response
  })

  client.interceptors.request.use(config => {
    if (cookies.size) {
      config.headers.Cookie = [...cookies.entries()]
        .map(([key, value]) => `${key}=${value}`)
        .join('; ')
    }

    return config
  })

  return client
}

async function extractToken(client) {
  const { data: html } = await client.get('/')

  const match = String(html).match(
    /s_tt\s*=\s*['"]([^'"]+)['"]/
  )

  if (!match?.[1]) {
    throw new Error('Session token SSSTik tidak ditemukan.')
  }

  return match[1]
}

function extractDownloads($) {
  const downloads = []
  const seen = new Set()

  function add(type, href) {
    if (!href) return

    try {
      const url = new URL(href, BASE_URL).href

      if (!['http:', 'https:'].includes(new URL(url).protocol)) {
        return
      }

      const key = `${type}:${url}`

      if (seen.has(key)) return

      seen.add(key)
      downloads.push({ type, url })
    } catch {}
  }

  const isPhoto =
    $('ul.splide__list').length > 0 ||
    $('a.slide').length > 0 ||
    $('a.download_slide').length > 0

  if (isPhoto) {
    $('a.slide, a.download_slide').each((_, element) => {
      add('photo', $(element).attr('href'))
    })

    add('music', $('a.music').attr('href'))

    return { isPhoto, downloads }
  }

  $('a').each((_, element) => {
    const anchor = $(element)
    const href = anchor.attr('href')
    const text = anchor.text().trim().toLowerCase()

    if (!href || href === '/' || href.includes('snaptik')) {
      return
    }

    if (
      anchor.hasClass('without_watermark') ||
      text.includes('tanpa tanda air') ||
      text.includes('without watermark')
    ) {
      add('video', href)
    } else if (
      anchor.hasClass('music') ||
      text.includes('mp3') ||
      text.includes('music')
    ) {
      add('music', href)
    }
  })

  if (!downloads.length) {
    $('a.pure-button').each((_, element) => {
      const href = $(element).attr('href')

      if (href?.includes('dl=')) {
        add('video', href)
      }
    })
  }

  return { isPhoto: false, downloads }
}

async function scrape(input) {
  try {
    const url = normalizeUrl(input)
    const client = createClient()

    const token = await extractToken(client)

    const formData = new URLSearchParams({
      id: url,
      locale: 'id',
      tt: token
    })

    const { data: html } = await client.post(
      '/abc?url=dl',
      formData.toString(),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
          'HX-Request': 'true',
          'HX-Trigger': 'submit',
          'HX-Target': 'target'
        }
      }
    )

    const $ = cheerio.load(html)

    if (
      $('div.math-inline').length > 0 ||
      html.includes('Please paste a valid link') ||
      html.includes('Error')
    ) {
      throw new Error('Link tidak valid atau SSSTik gagal memproses.')
    }

    const title =
      $('p.maintext').text().trim() ||
      $('h2').text().trim() ||
      'TikTok Content'

    const author = $('h2').text().trim() || 'Unknown'
    const thumbnail = $('img.result_author').attr('src') || ''

    const { isPhoto, downloads } = extractDownloads($)

    if (!downloads.length) {
      throw new Error('Tidak ada link download yang ditemukan.')
    }

    return {
      status: true,
      result: {
        title,
        author,
        thumbnail,
        type: isPhoto ? 'photo' : 'video',
        downloads
      }
    }
  } catch (error) {
    return {
      status: false,
      message: error.message || 'Scraping TikTok gagal.'
    }
  }
}

export default { scrape }
export { scrape, normalizeUrl }
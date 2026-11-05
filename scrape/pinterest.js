const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36'

import { writeFile, readFile } from 'node:fs/promises'


async function tryWidgets(query, limit = 6) {
  const url = `https://widgets.pinterest.com/v3/pidgets/search/pins/?q=${encodeURIComponent(query)}`
  const res = await fetch(url, { headers: { 'User-Agent': UA } })
  const json = await res.json()
  const pins = json?.data?.pins || []
  return pins.slice(0, limit).map(p => ({
    image: p.images?.orig?.url || p.images?.['736x']?.url,
    video: null,
    title: p.title || query,
    pin_url: `https://www.pinterest.com/pin/${p.id}/`
  })).filter(x=>x.image)
}

async function tryBaseSearch(query, limit = 6) {
  const data = encodeURIComponent(JSON.stringify({
    options: {
      query,
      scope: 'pins',
      page_size: limit,
      redux_normalize_feed: true,
      rs: 'typed',
      seo_draft: false,
      source: 'search_box'
    },
    context: {}
  }))
  const url = `https://www.pinterest.com/resource/BaseSearchResource/get/?source_url=%2Fsearch%2Fpins%2F%3Fq%3D${encodeURIComponent(query)}&data=${data}&_=${Date.now()}`
  const res = await fetch(url, {
    headers: {
      'User-Agent': UA,
      'Accept': 'application/json',
      'X-Pinterest-PWS-Handler': 'www/[search]/[search].js',
      'X-Pinterest-Source-Url': `/search/pins/?q=${encodeURIComponent(query)}`,
      'Referer': `https://www.pinterest.com/search/pins/?q=${encodeURIComponent(query)}`
    }
  })
  const text = await res.text()
  if (text.startsWith('Invalid')) throw new Error('Invalid')
  const json = JSON.parse(text)
  const results = json?.resource_response?.data?.results || []
  return results.slice(0, limit).map(p=>({
    image: p.images?.orig?.url || p.images?.['736x']?.url,
    video: p.videos?.video_list ? Object.values(p.videos.video_list).sort((a,b)=>b.width-a.width)[0]?.url : null,
    title: p.title || p.description || query,
    pin_url: `https://www.pinterest.com/pin/${p.id}/`
  })).filter(x=>x.image||x.video)
}

async function tryPublicProxy(query, limit = 6) {
  const url = `https://pinterest-api-three.vercel.app/api/pinterest/search?query=${encodeURIComponent(query)}&limit=${limit}`
  const res = await fetch(url, { headers: { 'User-Agent': UA } })
  const json = await res.json()
  const pins = json?.data || json?.result || []
  return pins.slice(0, limit).map(p=>({
    image: p.image || p.images?.orig,
    video: p.video || null,
    title: p.title || query,
    pin_url: p.pin || ''
  })).filter(x=>x.image)
}

export async function pinterestSearch(query, limit = 6) {
  query = query.trim()
  if (!query) throw new Error('Query kosong')
  
  const methods = [tryWidgets, tryBaseSearch, tryPublicProxy]
  let lastErr
  for (const fn of methods) {
    try {
      const r = await fn(query, limit)
      if (r && r.length) return r
    } catch (e) { lastErr = e; continue }
  }
  throw new Error(`Semua method gagal: ${lastErr?.message}`)
}

export async function pinterestDl(pinUrl) {
  if (pinUrl.includes('pin.it')) {
    const r = await fetch(pinUrl, { redirect: 'manual', headers: { 'User-Agent': UA } })
    pinUrl = r.headers.get('location') || pinUrl
  }
  const res = await fetch(pinUrl, { headers: { 'User-Agent': UA } })
  const html = await res.text()
  const video = [...html.matchAll(/https:\/\/v1\.pinimg\.com\/videos\/[^"]+\.mp4/g)].map(m=>m[0].replace(/\\/g,'')).sort((a,b)=>parseInt(b.match(/V_(\d+)/)?.[1]||0)-parseInt(a.match(/V_(\d+)/)?.[1]||0))[0] || null
  const image = html.match(/"orig":\{"url":"(https:[^"]+)"/)?.[1]?.replace(/\\u002F/g,'/').replace(/\\/g,'') || html.match(/https:\/\/i\.pinimg\.com\/originals\/[^"]+\.(?:jpg|png)/)?.[0] || null
  if (!image && !video) throw new Error('Media tidak ketemu')
  return { image, video, download: video || image, isVideo: !!video }
}

async function getBlurThumbnail(imageUrl) {
  try {
    const res = await fetch(imageUrl)
    const buf = Buffer.from(await res.arrayBuffer())
    try {
      const sharp = (await import('sharp')).default
      return await sharp(buf).resize(48, 48).blur(2).jpeg({ quality: 30 }).toBuffer()
    } catch {
      return buf.slice(0, 8000)
    }
  } catch { return null }
}
export default { search: pinterestSearch, dl: pinterestDl, pinterestSearch, pinterestDl, getBlurThumbnail }
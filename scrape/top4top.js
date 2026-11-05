/*
     Credit Scrape: Dhika and Fiony Team
*/
import axios from 'axios'
import FormData from 'form-data'
import { fileTypeFromBuffer } from 'file-type'
import { randomInt } from 'node:crypto'

async function upload(buffer, imageOnly = false) {
  if (!Buffer.isBuffer(buffer) || !buffer.length) {
    throw new Error('Buffer file kosong atau tidak valid.')
  }

  const detected = await fileTypeFromBuffer(buffer)
  const ext = detected?.ext || 'bin'
  const mime = detected?.mime || 'application/octet-stream'

  if (imageOnly && !mime.startsWith('image/')) {
    throw new Error(`File bukan gambar: ${mime}`)
  }

  const form = new FormData()

  form.append('file_0_', buffer, {
    filename: `${randomInt(10000, 99999)}.${ext}`,
    contentType: mime,
    knownLength: buffer.length
  })

  form.append('submitr', '[ رفع الملفات ]')

  const response = await axios.post(
    'https://top4top.io/index.php',
    form,
    {
      headers: {
        ...form.getHeaders(),
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        Accept: 'text/html,application/xhtml+xml'
      },
      timeout: 60000,
      maxBodyLength: Infinity,
      maxContentLength: Infinity,
      responseType: 'text'
    }
  )

  const html = String(response.data || '')

  const match = html.match(
    /https?:\/\/[a-zA-Z0-9.-]+\.top4top\.io\/[a-z]_[^"'\s<>]+/i
  )

  if (!match?.[0]) {
    throw new Error('Upload gagal, direct link tidak ditemukan.')
  }

  return {
    url: match[0].replaceAll('&amp;', '&'),
    filename: `${randomInt(10000, 99999)}.${ext}`,
    mimetype: mime,
    extension: ext,
    size: buffer.length,
    host: 'Top4Top'
  }
}

export async function uploadFile(buffer) {
  return upload(buffer)
}

export async function uploadImage(buffer) {
  return upload(buffer, true)
}

export default {
  uploadFile,
  uploadImage
}
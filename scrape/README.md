# Scrape modules

Taruh modul scraper ESM di folder ini. Contoh format:

```js
export async function search(query) {
  return { status: true, result: [] }
}
```

Scraper dipisah dari handler WhatsApp supaya error scraper tidak mengganggu koneksi utama.

// Scarica in seed-assets/ le riproduzioni in pubblico dominio delle 12 opere
// del seed, via API pageimages di Wikipedia (immagini hostate su Wikimedia
// Commons, tutte opere ante-1650 → PD-Art). Le thumbnail sono richieste a
// larghezza fissa per restare ampiamente sotto il limite dei 5MB di /uploads.
//
// Uso: node src/scripts/fetch-seed-images.js
// Idempotente: i file già scaricati vengono saltati. Una pausa tra le
// richieste evita il rate limiting (HTTP 429) di Wikimedia.
const fs = require('fs');
const path = require('path');

const OUT_DIR = path.join(__dirname, 'seed-assets');
const THUMB_WIDTH = 1200;
// Wikimedia richiede uno User-Agent identificabile per le chiamate API.
const USER_AGENT = 'ArtAround-seed/1.0 (progetto universitario Tecnologie Web)';

// basename → titolo dell'articolo Wikipedia (en) la cui immagine principale
// è la riproduzione dell'opera. Il basename è la chiave idempotente usata
// anche dal seed (estensione decisa dal Content-Type reale della thumbnail).
const IMAGES = [
  ['uo-ufz-001-nascita-di-venere', 'The Birth of Venus'],
  ['uo-ufz-002-primavera', 'Primavera (Botticelli)'],
  ['uo-ufz-003-annunciazione', 'Annunciation (Leonardo)'],
  ['uo-ufz-004-adorazione-dei-magi', 'Adoration of the Magi (Leonardo)'],
  ['uo-ufz-005-tondo-doni', 'Doni Tondo'],
  ['uo-ufz-006-madonna-del-cardellino', 'Madonna of the Goldfinch'],
  ['uo-ufz-007-ritratto-di-leone-x', 'Portrait of Leo X'],
  ['uo-ufz-008-venere-di-urbino', 'Venus of Urbino'],
  ['uo-ufz-009-flora', 'Flora (Titian)'],
  ['uo-ufz-010-medusa', 'Medusa (Caravaggio)'],
  ['uo-ufz-011-sacrificio-di-isacco', 'Sacrifice of Isaac (Caravaggio)'],
  ['uo-ufz-012-giuditta-e-oloferne', 'Judith Slaying Holofernes (Artemisia Gentileschi, Florence)'],
];

const EXT_BY_MIME = { 'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp' };
const REQUEST_PAUSE_MS = 4000;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function fetchThumbnailUrl(article) {
  const api = new URL('https://en.wikipedia.org/w/api.php');
  api.search = new URLSearchParams({
    action: 'query',
    format: 'json',
    prop: 'pageimages',
    piprop: 'thumbnail',
    pithumbsize: String(THUMB_WIDTH),
    redirects: '1',
    titles: article,
  }).toString();
  const res = await fetch(api, { headers: { 'User-Agent': USER_AGENT } });
  if (!res.ok) throw new Error(`API ${res.status} per "${article}"`);
  const pages = (await res.json())?.query?.pages || {};
  const page = Object.values(pages)[0];
  if (!page?.thumbnail?.source) throw new Error(`nessuna immagine principale per "${article}"`);
  return page.thumbnail.source;
}

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const failures = [];
  for (const [basename, article] of IMAGES) {
    const existing = fs.readdirSync(OUT_DIR).find((f) => f.startsWith(basename + '.'));
    if (existing) {
      console.log(`già presente, salto: ${existing}`);
      continue;
    }
    try {
      await sleep(REQUEST_PAUSE_MS);
      const url = await fetchThumbnailUrl(article);
      let res = await fetch(url, { headers: { 'User-Agent': USER_AGENT } });
      if (res.status === 429) {
        await sleep(REQUEST_PAUSE_MS * 5);
        res = await fetch(url, { headers: { 'User-Agent': USER_AGENT } });
      }
      if (!res.ok) throw new Error(`download ${res.status} da ${url}`);
      const mime = (res.headers.get('content-type') || '').split(';')[0];
      const ext = EXT_BY_MIME[mime];
      if (!ext) throw new Error(`Content-Type inatteso "${mime}" da ${url}`);
      const data = Buffer.from(await res.arrayBuffer());
      if (data.length > 5 * 1024 * 1024) throw new Error(`file oltre 5MB (${data.length} byte)`);
      fs.writeFileSync(path.join(OUT_DIR, basename + ext), data);
      console.log(`ok  ${basename}${ext}  ${(data.length / 1024).toFixed(0)}KB  (${article})`);
    } catch (err) {
      failures.push(`${basename}: ${err.message}`);
      console.error(`ERR ${basename}: ${err.message}`);
    }
  }
  if (failures.length) {
    console.error(`\n${failures.length} immagini non scaricate.`);
    process.exit(1);
  }
}

main();

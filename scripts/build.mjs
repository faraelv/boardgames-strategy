// Construye la PWA en dist/:
// - valida cada juego de games/ (campos mínimos y planes con id único),
// - copia la app de src/ y junta los juegos en dist/games.json (por nombre),
// - versiona el service worker para que los móviles vean «Actualizar»,
// - genera dist-preview/jugada-maestra.html: todo en un solo fichero, para revisar sin servidor.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const SRC = 'src', OUT = 'dist', PREVIEW = 'dist-preview';
const fail = m => { console.error('✗ ' + m); process.exit(1); };

const files = fs.readdirSync('games').filter(f => f.endsWith('.json'));
const strip = n => n.replace(/^[¡¿]/, '');
const games = files.map(f => {
  const g = JSON.parse(fs.readFileSync(path.join('games', f), 'utf8'));
  if (!g.id || !g.name || !Array.isArray(g.plans) || !g.plans.length) fail(`${f}: faltan id, name o plans`);
  const ids = new Set();
  for (const p of g.plans) {
    if (!p.id || !p.title || !p.thesis) fail(`${f}: cada plan necesita id, title y thesis`);
    if (!/^[a-z0-9]+$/i.test(p.id) || ids.has(p.id)) fail(`${f}: id de plan no válido o repetido (${p.id})`);
    ids.add(p.id);
    for (const ph of p.phases || []) if (!ph.when || !ph.goal || !Array.isArray(ph.do)) fail(`${f}/${p.id}: fase incompleta`);
    for (const k of p.keys || []) if (!k.title || !k.text) fail(`${f}/${p.id}: táctica incompleta`);
  }
  return g;
}).sort((a, b) => strip(a.name).localeCompare(strip(b.name), 'es'));
if (process.argv.includes('--check')) { console.log(`✓ ${games.length} juegos válidos`); process.exit(0); }

fs.rmSync(OUT, { recursive: true, force: true });
fs.cpSync(SRC, OUT, { recursive: true });
const tints = JSON.parse(fs.readFileSync(path.join(SRC, 'covers', 'tints.json'), 'utf8'));
for (const g of games) {
  if (fs.existsSync(path.join(SRC, 'covers', `${g.id}.webp`))) g.cover = `covers/${g.id}.webp`;
  if (tints[g.id]) g.tint = tints[g.id];
}
fs.rmSync(path.join(OUT, 'covers', 'tints.json'));
fs.writeFileSync(path.join(OUT, 'games.json'), JSON.stringify(games));

const walk = d => fs.readdirSync(d, { withFileTypes: true })
  .flatMap(e => e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]);
const shell = walk(OUT).map(f => path.relative(OUT, f).split(path.sep).join('/')).filter(f => f !== 'sw.js').sort();
const hash = crypto.createHash('sha256');
for (const f of shell) hash.update(f).update(fs.readFileSync(path.join(OUT, f)));
const version = hash.digest('hex').slice(0, 12);
const appVersion = `${new Date().toISOString().slice(0, 10).replaceAll('-', '')}-${version.slice(0, 6)}`;
const idx = path.join(OUT, 'index.html');
fs.writeFileSync(idx, fs.readFileSync(idx, 'utf8').replace('__APP_VERSION__', appVersion));
const swPath = path.join(OUT, 'sw.js');
fs.writeFileSync(swPath, fs.readFileSync(swPath, 'utf8')
  .replace('__VERSION__', version).replace('__SHELL__', JSON.stringify(['./', ...shell.map(f => './' + f)])));

// Vista previa en un solo fichero: datos y portadas incrustados, sin service worker.
const data = f => 'data:image/webp;base64,' + fs.readFileSync(path.join(OUT, f)).toString('base64');
const inline = games.map(g => ({
  ...(g.cover ? { ...g, cover: data(g.cover) } : g),
  plans: g.plans.map(p => !p.cards ? p : { ...p, cards: { ...p.cards,
    items: p.cards.items.map(c => c && c.image ? { ...c, image: data(c.image) } : c) } })
}));
let html = fs.readFileSync(idx, 'utf8')
  .replace(/<!doctype html>[\s\S]*?<head>\n/, '')
  .replace(/<link rel="(manifest|icon|apple-touch-icon)"[^>]*>\n/g, '')
  .replace(/<\/head>\n<body>\n/, '').replace(/<\/body>\n<\/html>\n?$/, '')
  .replace('<script>window.__GAMES__ = null;</script>', `<script>window.__GAMES__ = ${JSON.stringify(inline)}; window.__APP_VERSION__ = ${JSON.stringify(appVersion)};</script>`)
  .replace('<script src="app.js"></script>', () => `<script>\n${fs.readFileSync(path.join(OUT, 'app.js'), 'utf8')}</script>`);
fs.mkdirSync(PREVIEW, { recursive: true });
fs.writeFileSync(path.join(PREVIEW, 'jugada-maestra.html'), html);

console.log(`ok · versión ${appVersion} · ${games.length} juegos: ${games.map(g => g.name).join(', ')}`);

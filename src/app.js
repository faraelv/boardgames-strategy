// Jugada Maestra: estrategias para ganar, un JSON por juego (games/*.json → games.json).
// Navegación por hash (#juego o #juego-plan) para que el botón atrás de Android funcione.
'use strict';

const app = document.getElementById('app');
let GAMES = [];

function el(tag, attrs = {}, kids = []) {
  const n = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v == null || v === false) continue;
    if (k.startsWith('on')) n.addEventListener(k.slice(2), v);
    else if (k === 'html') n.innerHTML = v;
    else n.setAttribute(k, v);
  }
  for (const c of [].concat(kids)) if (c != null && c !== false) n.append(c);
  return n;
}
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const rich = s => esc(s).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>');
const R = (tag, text, attrs = {}) => el(tag, { ...attrs, html: rich(text) });
const strip = n => n.replace(/^[¡¿]/, '');

function route() {
  const h = decodeURIComponent(location.hash.slice(1));
  if (!h) return renderList();
  const g = GAMES.find(g => h === g.id || h.startsWith(g.id + '-'));
  if (!g) return renderList();
  const [pid, tab] = h.slice(g.id.length + 1).split('-');
  const plan = g.plans.find(p => p.id === pid) || g.plans[0];
  renderGame(g, plan, tab);
}

function cover(g) {
  return g.cover
    ? el('img', { class: 'cover', src: g.cover, alt: '' })
    : el('span', { class: 'cover mono', 'aria-hidden': 'true' }, strip(g.name)[0]);
}

// La misma versión en la app y en la copia para PC: así se ve de un vistazo si van a la par.
const VERSION = [window.__APP_VERSION__, document.documentElement.dataset.version]
  .find(v => v && !v.startsWith('__')) || '';

function renderList() {
  document.title = 'Jugada Maestra';
  const n = GAMES.reduce((a, g) => a + g.plans.length, 0);
  app.replaceChildren(
    el('p', { class: 'intro' }, `Las mejores estrategias para ganar. ${GAMES.length} juegos, ${n} planes.`),
    el('div', { class: 'games' }, GAMES.map(g => el('button', {
      class: 'game', type: 'button', style: g.tint ? `--tint:${g.tint}` : null,
      onclick: () => { location.hash = g.id; }
    }, [
      cover(g),
      el('h2', {}, g.name),
      el('span', { class: 'meta' }, g.plans.map(p => p.title).join(' · ')),
      el('span', { class: 'count' }, g.plans.length === 1 ? '1 plan' : `${g.plans.length} planes`)
    ]))),
    el('p', { class: 'empty' }, 'Para añadir una estrategia, pídesela a Claude en el proyecto «Juegos de mesa» con la fuente (vídeo, guía o lo que hayáis descubierto jugando).'),
    VERSION ? el('p', { class: 'stamp' }, `Versión ${VERSION}`) : null
  );
  scrollTo(0, 0);
}

// Cada plan se divide en pestañas para ver solo lo que hace falta en cada momento.
// Solo aparecen las que tienen contenido; con una sola, no se muestra la barra.
function tabsOf(plan) {
  return [
    ['resumen', 'Resumen', true],
    ['rondas', 'Rondas', !!plan.phases],
    ['tacticas', plan.phases ? 'Tácticas' : 'Claves', !!plan.keys],
    ['cartas', 'Cartas', !!plan.cards]
  ].filter(t => t[2]);
}

function renderGame(g, plan, tab) {
  document.title = `${g.name} · Jugada Maestra`;
  const tabs = tabsOf(plan);
  if (!tabs.some(t => t[0] === tab)) tab = tabs[0][0];
  const go = (p, t) => location.replace('#' + g.id + '-' + p.id + (t && t !== 'resumen' ? '-' + t : ''));

  const parts = [
    el('div', { class: 'title-block' }, [el('span', { class: 'eyebrow' }, 'Estrategia'), el('h1', {}, g.name)])
  ];
  // Al cambiar de plan se mantiene la pestaña si el otro plan también la tiene.
  parts.push(el('div', { class: 'plans', role: 'group', 'aria-label': 'Plan' }, g.plans.map(p =>
    el('button', { type: 'button', 'aria-pressed': String(p === plan), onclick: () => { if (p !== plan) go(p, tab); } },
      [p.title, p.kind ? el('small', {}, p.kind) : null]))));
  if (tabs.length > 1) parts.push(el('div', { class: 'tabs', role: 'tablist' }, tabs.map(([id, label]) =>
    el('button', { type: 'button', role: 'tab', 'aria-selected': String(id === tab), onclick: () => { if (id !== tab) go(plan, id); } }, label))));

  const view = ({ resumen, rondas, tacticas, cartas })[tab];
  parts.push(...view(plan).filter(Boolean));
  app.replaceChildren(...parts);
  scrollTo(0, 0);
}

function resumen(plan) {
  return [
    el('div', { class: 'thesis' }, [
      el('span', { class: 'eyebrow' }, 'La idea'),
      R('p', plan.thesis),
      plan.style ? R('p', plan.style, { class: 'style' }) : null
    ]),
    (plan.strengths || plan.weaknesses) ? el('section', { class: 'sec' }, el('div', { class: 'sw' }, [
      plan.strengths ? el('div', {}, [el('h3', {}, 'Puntos fuertes'), el('ul', {}, plan.strengths.map(t => R('li', t)))]) : null,
      plan.weaknesses ? el('div', { class: 'weak' }, [el('h3', {}, 'Puntos débiles'), el('ul', {}, plan.weaknesses.map(t => R('li', t)))]) : null
    ])) : null,
    plan.warnings ? el('section', { class: 'sec' }, [
      el('h2', {}, 'Ojo'), el('ul', { class: 'plain' }, plan.warnings.map(t => R('li', t)))
    ]) : null,
    plan.pending ? el('section', { class: 'sec' }, el('p', { class: 'note check', html: '<b>Por verificar.</b> ' + rich(plan.pending) })) : null,
    plan.sources ? el('div', { class: 'sources' }, [
      el('span', { class: 'eyebrow' }, 'Fuentes'),
      ...plan.sources.map(s => s.url ? el('a', { href: s.url, target: '_blank', rel: 'noopener' }, s.title) : el('span', {}, s.title))
    ]) : null
  ];
}

function rondas(plan) {
  return [el('section', { class: 'sec' }, [
    el('ol', { class: 'timeline' }, plan.phases.map(ph => el('li', { class: 'phase' }, [
      el('div', { class: 'rail', 'aria-hidden': 'true' }, [el('span', { class: 'dot' }), el('span', { class: 'line' })]),
      el('div', { class: 'card' }, [
        el('span', { class: 'when' }, ph.when),
        el('h3', { html: esc(ph.goal) + (ph.check ? '<span class="flag">Por verificar</span>' : '') }),
        el(ph.ordered ? 'ol' : 'ul', {}, ph.do.map(t => R('li', t))),
        ph.note ? R('p', ph.note, { class: 'note muted' }) : null
      ])
    ])))
  ])];
}

function tacticas(plan) {
  return [el('section', { class: 'sec' }, [
    el('div', { class: 'keys' }, plan.keys.map(k => el('div', { class: 'key' }, [
      el('div', { class: 'head' }, [el('h3', {}, k.title), k.when ? el('span', { class: 'chip' }, k.when) : null]),
      R('p', k.text)
    ])))
  ])];
}

function cartas(plan) {
  const c = plan.cards;
  return [el('section', { class: 'sec' }, [
    el('h2', {}, c.title),
    // Cartas con imagen: ilustración original arriba y el texto de la carta traducido en el panel de abajo.
    c.items.some(x => typeof x === 'object')
      ? el('div', { class: 'kcards' }, c.items.map(x => typeof x === 'string' ? R('p', x) : el('article', { class: 'kcard' }, [
          x.image ? el('img', { src: x.image, alt: '', loading: 'lazy' }) : null,
          el('div', { class: 'panel' }, [
            el('h3', {}, [x.name, x.original ? el('small', {}, x.original) : null]),
            ...x.text.map(t => R('p', t))
          ]),
          x.why ? el('div', { class: 'why' }, [x.tag ? el('span', { class: 'tag' }, x.tag) : null, R('p', x.why)]) : null
        ])))
      : el('ul', { class: 'plain' }, c.items.map(t => R('li', t))),
    ...(c.after || []).map(t => R('p', t, { class: 'note muted' }))
  ])];
}

document.getElementById('home').addEventListener('click', () => {
  if (location.hash) history.length > 1 ? history.back() : (location.hash = '');
});
addEventListener('hashchange', route);

// Wake lock: la pantalla no se apaga mientras se consulta una estrategia.
async function keepAwake() { try { await navigator.wakeLock?.request('screen'); } catch {} }
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') keepAwake(); });

// Service worker y aviso de actualización (solo en la PWA publicada).
if ('serviceWorker' in navigator && location.protocol === 'https:' && !window.__GAMES__) {
  navigator.serviceWorker.register('sw.js').then(reg => {
    const offer = w => { const b = document.getElementById('update'); b.hidden = false; b.onclick = () => w.postMessage('skipWaiting'); };
    if (reg.waiting && navigator.serviceWorker.controller) offer(reg.waiting);
    reg.addEventListener('updatefound', () => {
      const w = reg.installing;
      w?.addEventListener('statechange', () => { if (w.state === 'installed' && navigator.serviceWorker.controller) offer(w); });
    });
  }).catch(() => {});
  let reloading = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => { if (!reloading) { reloading = true; location.reload(); } });
}

(async () => {
  try {
    GAMES = window.__GAMES__ || await (await fetch('games.json', { cache: 'no-cache' })).json();
  } catch {
    app.replaceChildren(el('p', { class: 'intro' }, 'No se han podido cargar las estrategias. Abre la app con conexión una vez.'));
    return;
  }
  keepAwake();
  route();
})();

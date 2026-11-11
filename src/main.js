import { getPokemon, getAllNames, toSlug, thumbUrl, NotFoundError, MAX_ID } from './api.js';
import { initMusic, playCry } from './audio.js';

// ---------- Type colours (accent for the whole entry) ----------
const TYPE_COLORS = {
  normal: '#A8A77A', fire: '#EE8130', water: '#6390F0', electric: '#F7D02C',
  grass: '#7AC74C', ice: '#96D9D6', fighting: '#C22E28', poison: '#A33EA1',
  ground: '#E2BF65', flying: '#A98FF3', psychic: '#F95587', bug: '#A6B91A',
  rock: '#B6A136', ghost: '#735797', dragon: '#6F35FC', dark: '#705746',
  steel: '#B7B7CE', fairy: '#D685AD',
};

const STAT_LABELS = {
  hp: 'HP', attack: 'Attack', defense: 'Defense',
  'special-attack': 'Sp. Atk', 'special-defense': 'Sp. Def', speed: 'Speed',
};

// ---------- Elements ----------
const $ = (id) => document.getElementById(id);
const el = {
  form: $('search'), input: $('q'), status: $('status'), names: $('names'),
  random: $('random'), invite: $('invite'), sprite: $('sprite'), encounter: $('encounter'),
  dex: $('dex'), number: $('dex-number'), name: $('dex-name'), genus: $('dex-genus'),
  types: $('dex-types'), flavor: $('dex-flavor'), height: $('dex-height'),
  weight: $('dex-weight'), abilities: $('dex-abilities'), stats: $('dex-stats'),
  total: $('dex-total'), cry: $('cry'), shiny: $('shiny'),
  prev: $('prev'), next: $('next'), prevLabel: $('prev-label'), nextLabel: $('next-label'),
  recent: $('recent'), recentList: $('recent-list'),
};

// ---------- State ----------
let current = null;      // { pokemon, species }
let shiny = false;
let allNames = [];
let requestId = 0;       // ignore responses that arrive after a newer search

// ---------- Helpers ----------
const pad = (n) => `#${String(n).padStart(4, '0')}`;
const titleCase = (slug) => slug.split('-').map((w) => w[0].toUpperCase() + w.slice(1)).join(' ');
const wrapId = (id) => ((id - 1 + MAX_ID) % MAX_ID) + 1;

const english = (list, key) => list?.find((entry) => entry.language.name === 'en')?.[key];

function displayName({ pokemon, species }) {
  return english(species.names, 'name') ?? titleCase(pokemon.name);
}

function flavorText(species) {
  const entries = species.flavor_text_entries.filter((e) => e.language.name === 'en');
  const latest = entries.at(-1)?.flavor_text ?? '';
  return latest.replace(/[\f\n\r­]+/g, ' ').replace(/\s+/g, ' ').trim();
}

function spriteFor(pokemon, isShiny) {
  const s = pokemon.sprites;
  const animated = s.versions?.['generation-v']?.['black-white']?.animated;
  const key = isShiny ? 'front_shiny' : 'front_default';
  return animated?.[key] ?? s[key] ?? s.other?.['official-artwork']?.[key] ?? s.front_default;
}

/** Readable text colour on top of a type colour. */
function inkOn(hex) {
  const [r, g, b] = hex.match(/\w\w/g).map((c) => parseInt(c, 16) / 255);
  const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return lum > 0.55 ? '#1e2a4a' : '#ffffff';
}

function levenshtein(a, b) {
  const row = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let prev = row[0];
    row[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const tmp = row[j];
      row[j] = Math.min(row[j] + 1, row[j - 1] + 1, prev + (a[i - 1] === b[j - 1] ? 0 : 1));
      prev = tmp;
    }
  }
  return row[b.length];
}

function closestName(slug) {
  let best = null;
  let bestScore = Infinity;
  for (const name of allNames) {
    const score = levenshtein(slug, name);
    if (score < bestScore) [best, bestScore] = [name, score];
  }
  return bestScore <= Math.max(2, Math.floor(slug.length / 3)) ? best : null;
}

function setStatus(message, { html = false } = {}) {
  el.status[html ? 'innerHTML' : 'textContent'] = message;
}

// ---------- Rendering ----------
function renderSprite() {
  const { pokemon } = current;
  const img = el.sprite;
  img.hidden = false;
  img.alt = `${shiny ? 'Shiny ' : ''}${displayName(current)}`;
  img.src = spriteFor(pokemon, shiny);

  // Replay the landing animation
  el.encounter.classList.remove('is-landing');
  void el.encounter.offsetWidth;
  el.encounter.classList.add('is-landing');
}

function render() {
  const { pokemon, species } = current;
  const types = pokemon.types.map((t) => t.type.name);
  const accent = TYPE_COLORS[types[0]] ?? '#79c8f7';

  document.documentElement.style.setProperty('--accent', accent);
  document.documentElement.style.setProperty('--accent-ink', inkOn(accent));
  document.title = `${displayName(current)} – Pokémon Geek`;

  el.invite.hidden = true;
  el.dex.hidden = false;

  el.number.textContent = pad(species.id);
  el.name.textContent = displayName(current);
  el.genus.textContent = english(species.genera, 'genus') ?? '';

  el.types.replaceChildren(...types.map((type) => {
    const li = document.createElement('li');
    li.className = 'type';
    li.textContent = titleCase(type);
    li.style.setProperty('--type', TYPE_COLORS[type]);
    li.style.setProperty('--type-ink', inkOn(TYPE_COLORS[type]));
    return li;
  }));

  el.flavor.textContent = flavorText(species);
  el.height.textContent = `${(pokemon.height / 10).toFixed(1)} m`;
  el.weight.textContent = `${(pokemon.weight / 10).toFixed(1)} kg`;
  el.abilities.textContent = pokemon.abilities
    .map((a) => titleCase(a.ability.name) + (a.is_hidden ? ' (hidden)' : ''))
    .join(', ');

  let total = 0;
  el.stats.replaceChildren(...pokemon.stats.map(({ base_stat, stat }) => {
    total += base_stat;
    const row = document.createElement('div');
    row.className = 'stat';
    row.innerHTML = `
      <dt>${STAT_LABELS[stat.name] ?? stat.name}</dt>
      <dd>
        <span class="stat__value">${base_stat}</span>
        <span class="stat__bar" aria-hidden="true"><span style="--v:${Math.min(base_stat / 180, 1)}"></span></span>
      </dd>`;
    return row;
  }));
  el.total.textContent = total;

  const id = species.id;
  el.prevLabel.textContent = pad(wrapId(id - 1));
  el.nextLabel.textContent = pad(wrapId(id + 1));

  el.cry.disabled = !pokemon.cries?.latest;
  el.shiny.setAttribute('aria-pressed', String(shiny));
  el.shiny.textContent = shiny ? 'Show normal' : 'Show shiny';

  renderSprite();
}

// ---------- Recent searches (per browser, best effort) ----------
const RECENT_KEY = 'pokemon-geek:recent';

function loadRecent() {
  try {
    return JSON.parse(localStorage.getItem(RECENT_KEY)) ?? [];
  } catch {
    return [];
  }
}

function saveRecent(entry) {
  const list = [entry, ...loadRecent().filter((r) => r.id !== entry.id)].slice(0, 8);
  try {
    localStorage.setItem(RECENT_KEY, JSON.stringify(list));
  } catch { /* storage unavailable: still render this session's list */ }
  renderRecent(list);
}

function renderRecent(list = loadRecent()) {
  el.recent.hidden = list.length === 0;
  el.recentList.replaceChildren(...list.map(({ id, name }) => {
    const li = document.createElement('li');
    li.innerHTML = `
      <button class="recent__item" type="button" data-go="${id}">
        <img src="${thumbUrl(id)}" alt="" width="48" height="48" loading="lazy">
        <span>${name}</span>
      </button>`;
    return li;
  }));
}

// ---------- Search ----------
async function search(query, { pushHistory = true } = {}) {
  const slug = toSlug(query);
  if (!slug) {
    setStatus('Type a Pokémon name or number to search.');
    el.input.focus();
    return;
  }

  const myRequest = ++requestId;
  el.form.classList.add('is-loading');
  setStatus('Searching the tall grass…');

  try {
    const result = await getPokemon(slug);
    if (myRequest !== requestId) return;

    current = result;
    shiny = false;
    render();
    setStatus('');
    el.input.value = '';

    const hash = `#${result.pokemon.species.name}`;
    if (pushHistory && location.hash !== hash) history.pushState(null, '', hash);

    saveRecent({ id: result.species.id, name: displayName(result) });
  } catch (error) {
    if (myRequest !== requestId) return;
    console.error(error);

    if (error instanceof NotFoundError) {
      const guess = /^\d+$/.test(slug) ? null : closestName(slug);
      const label = query.trim().replace(/[<>&"]/g, '');
      setStatus(
        guess
          ? `No Pokémon called “${label}”. Did you mean <button class="link" type="button" data-go="${guess}">${titleCase(guess)}</button>?`
          : /^\d+$/.test(slug)
            ? `No Pokémon with number ${label}. Pick a number from 1 to ${MAX_ID}.`
            : `No Pokémon called “${label}”. Check the spelling and try again.`,
        { html: true },
      );
    } else {
      setStatus('Couldn’t reach PokéAPI. Check your connection and search again.');
    }
  } finally {
    if (myRequest === requestId) el.form.classList.remove('is-loading');
  }
}

const go = (idOrName) => search(String(idOrName));
const step = (delta) => current && go(wrapId(current.species.id + delta));

// ---------- Events ----------
el.form.addEventListener('submit', (event) => {
  event.preventDefault();
  search(el.input.value);
});

el.random.addEventListener('click', () => go(Math.floor(Math.random() * MAX_ID) + 1));
el.prev.addEventListener('click', () => step(-1));
el.next.addEventListener('click', () => step(1));

el.shiny.addEventListener('click', () => {
  if (!current) return;
  shiny = !shiny;
  el.shiny.setAttribute('aria-pressed', String(shiny));
  el.shiny.textContent = shiny ? 'Show normal' : 'Show shiny';
  renderSprite();
});

el.cry.addEventListener('click', () => {
  playCry(current?.pokemon.cries?.latest).catch((e) => console.warn('Cry could not play:', e));
});

// Any element with data-go (suggestions, recent list, "did you mean") starts a search
document.addEventListener('click', (event) => {
  const target = event.target.closest('[data-go]');
  if (target) go(target.dataset.go);
});

document.addEventListener('keydown', (event) => {
  const typing = event.target.matches('input, textarea, select, [contenteditable]');
  if (event.key === '/' && !typing) {
    event.preventDefault();
    el.input.focus();
  } else if (!typing && !event.metaKey && !event.ctrlKey && !event.altKey) {
    if (event.key === 'ArrowLeft') step(-1);
    if (event.key === 'ArrowRight') step(1);
  }
});

window.addEventListener('popstate', () => {
  const name = decodeURIComponent(location.hash.slice(1));
  if (name) search(name, { pushHistory: false });
});

// ---------- Start ----------
initMusic(document.querySelector('.music'));
renderRecent();

getAllNames()
  .then((names) => {
    allNames = names;
    el.names.replaceChildren(...names.map((n) => Object.assign(document.createElement('option'), { value: titleCase(n) })));
  })
  .catch((e) => console.warn('Autocomplete list unavailable:', e));

const initial = decodeURIComponent(location.hash.slice(1));
if (initial) search(initial, { pushHistory: false });

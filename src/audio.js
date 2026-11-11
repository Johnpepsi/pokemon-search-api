// Background music: one player, so songs never stack on top of each other.
//
// To add a song: put the MP3 in public/music/ and add a line below.
// The player lists every song here, in this order.
const TRACKS = [
  { title: 'Littleroot Town', src: './public/music/littleroot_town.mp3' },
  { title: 'Ending theme', src: './public/music/ending.mp3' },
  // { title: 'My new song', src: './public/music/my-new-song.mp3' },
];

const STORAGE_KEY = 'pokemon-geek:track';

const player = new Audio();
player.volume = 0.35;
player.preload = 'none';

let index = 0;

function savedIndex() {
  try {
    const saved = Number(localStorage.getItem(STORAGE_KEY));
    return Number.isInteger(saved) && TRACKS[saved] ? saved : 0;
  } catch {
    return 0;
  }
}

export function initMusic(root) {
  const toggle = root.querySelector('#music-toggle');
  const select = root.querySelector('#music-track');
  const next = root.querySelector('#music-next');

  select.replaceChildren(...TRACKS.map((track, i) =>
    Object.assign(document.createElement('option'), { value: i, textContent: track.title })));

  // Only one song: no need for a list or a "next" button
  if (TRACKS.length < 2) {
    select.hidden = true;
    next.hidden = true;
  }

  const load = (i) => {
    index = (i + TRACKS.length) % TRACKS.length;
    player.src = TRACKS[index].src;
    select.value = String(index);
    try { localStorage.setItem(STORAGE_KEY, String(index)); } catch { /* not essential */ }
  };

  const play = async () => {
    try {
      await player.play();
    } catch (error) {
      console.warn(`Couldn't play "${TRACKS[index].title}":`, error);
    }
  };

  const sync = () => {
    const playing = !player.paused;
    root.classList.toggle('is-playing', playing);
    toggle.setAttribute('aria-pressed', String(playing));
    toggle.textContent = playing ? 'Pause music' : 'Play music';
  };

  load(savedIndex());

  toggle.addEventListener('click', () => (player.paused ? play() : player.pause()));

  select.addEventListener('change', () => {
    load(Number(select.value));
    play();
  });

  next.addEventListener('click', () => {
    load(index + 1);
    play();
  });

  // When a song finishes, move on to the next one (and wrap around)
  player.addEventListener('ended', () => {
    if (TRACKS.length < 2) return play();
    load(index + 1);
    play();
  });

  player.addEventListener('play', sync);
  player.addEventListener('pause', sync);
}

// The Pokémon's own cry, separate from the music.
const cryPlayer = new Audio();
cryPlayer.volume = 0.5;

export function playCry(url) {
  if (!url) return Promise.resolve();
  cryPlayer.src = url;
  return cryPlayer.play();
}

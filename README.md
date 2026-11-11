# Pokémon Geek

Search any Pokémon by name or National Pokédex number. It drops onto the grass of a pixel-art field, and its Pokédex entry appears below: types, genus, flavour text, height, weight, abilities and base stats.

Built with plain HTML, CSS and JavaScript (ES modules), with no framework and no build step. Data comes from [PokéAPI](https://pokeapi.co/).

## Features

- **Forgiving search**: accepts names or numbers (`Mudkip`, `258`, `#0258`, `mr. mime`, `farfetch'd`, `nidoran♀`), with autocomplete for every species
- **"Did you mean…?"**: typos like `mudkop` suggest the closest real name (Levenshtein distance)
- **Animated sprites** where available, with a shiny toggle
- **Play the Pokémon's cry**
- **Browse the Pokédex** with Previous and Next, or the ← → keys
- **Surprise me** picks a random Pokémon
- **Shareable links**: every Pokémon has its own URL (`#mudkip`), and the browser back button works
- **Recently seen** list, saved in the browser
- **Background music player** with a song list and Next button; add your own songs with one line of code
- Accent colour follows the Pokémon's primary type
- Responsive, keyboard-accessible, dark mode, and respects reduced-motion settings

## Run it locally

ES modules don't load from `file://`, so serve the folder:

```bash
npx serve .
# or
python3 -m http.server
```

Then open the printed URL. It deploys to GitHub Pages as-is.

## Add your own songs

1. Put the MP3 in `public/music/`
2. Add a line to the `TRACKS` list at the top of `src/audio.js`:

```js
{ title: 'My new song', src: './public/music/my-new-song.mp3' },
```

The player lists every song in that order, skips to the next one when a song ends, and remembers the last song you picked.

## Project structure

```
index.html          markup
public/style.css    styles (design tokens at the top)
src/api.js          PokéAPI calls, caching, name normalisation
src/audio.js        background music and cries
src/main.js         state, rendering, events
public/assets/      pixel-art background
public/music/       music tracks
```

## What I learned

- `fetch` with `async`/`await`, checking `response.ok`, and treating a 404 differently from a network failure
- Caching promises in a `Map` so repeated lookups don't re-request
- Ignoring stale responses when a newer search starts before the old one finishes
- Following related API resources (pokemon → species → default variety)
- Syncing app state with the URL using `history.pushState` and `popstate`
- Using `localStorage` safely (wrapped in `try/catch`)

---

A fan project. Pokémon and Pokémon character names are trademarks of Nintendo.

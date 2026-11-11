// All PokéAPI access lives here. Responses are cached in memory so
// browsing back and forth never re-downloads the same Pokémon.

const BASE = 'https://pokeapi.co/api/v2';
export const MAX_ID = 1025; // National Pokédex size

const cache = new Map();

export class NotFoundError extends Error {}

async function getJSON(url) {
  if (cache.has(url)) return cache.get(url);

  const request = fetch(url).then((response) => {
    if (response.status === 404) throw new NotFoundError(url);
    if (!response.ok) throw new Error(`PokéAPI responded with ${response.status}`);
    return response.json();
  });

  cache.set(url, request);
  request.catch(() => cache.delete(url)); // don't cache failures
  return request;
}

/** Turn whatever the user typed into a PokéAPI slug: "Mr. Mime" -> "mr-mime", "#025" -> "25". */
export function toSlug(input) {
  const text = String(input)
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // é -> e
    .replace(/♀/g, '-f')
    .replace(/♂/g, '-m')
    .replace(/^#/, '');

  if (/^\d+$/.test(text)) return String(Number(text));

  return text
    .replace(/['’.:]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

/**
 * Fetch a Pokémon and its species entry.
 * Some species ("deoxys", "giratina") only exist in /pokemon under a form name,
 * so on a 404 we look the species up and follow its default variety.
 */
export async function getPokemon(query) {
  const slug = toSlug(query);
  if (!slug) throw new NotFoundError('empty');

  let pokemon;
  try {
    pokemon = await getJSON(`${BASE}/pokemon/${slug}`);
  } catch (error) {
    if (!(error instanceof NotFoundError)) throw error;
    const species = await getJSON(`${BASE}/pokemon-species/${slug}`);
    const variety = species.varieties.find((v) => v.is_default) ?? species.varieties[0];
    pokemon = await getJSON(variety.pokemon.url);
  }

  const species = await getJSON(pokemon.species.url);
  return { pokemon, species };
}

/** Names of every species, for autocomplete and "did you mean". */
export async function getAllNames() {
  const data = await getJSON(`${BASE}/pokemon-species?limit=${MAX_ID}`);
  return data.results.map((r) => r.name);
}

/** Static sprite by id. Served from GitHub, so it works without an API call. */
export const thumbUrl = (id) =>
  `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${id}.png`;

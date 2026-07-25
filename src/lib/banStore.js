// ── The Void (ban store) ──────────────────────────────────────────────────────
// Recipes you've 86'd, kept locally. The original store held only recipe IDs;
// v2-compatible entries also keep a compact recipe snapshot so The Void can
// show what was banished after an app restart. Existing ID-only installs are
// migrated on read and remain fully restorable.

import AsyncStorage from "@react-native-async-storage/async-storage";

const KEY = "potluck_void_v1";

const compactRecipe = (recipe) => {
  if (!recipe || typeof recipe !== "object" || !recipe.id) return null;

  return {
    id: recipe.id,
    name: recipe.name || "",
    image: recipe.image || null,
    category: recipe.category || null,
    cuisine: recipe.cuisine || null,
  };
};

const normalizeEntry = (value) => {
  // Legacy format: ["recipe-id", ...]
  if (typeof value === "string" && value) {
    return { id: value, recipe: null, banishedAt: null };
  }

  if (!value || typeof value !== "object") return null;

  // Current format, plus a tolerant fallback if a recipe object itself was
  // ever written by an intermediate build.
  const sourceRecipe = value.recipe || (value.name ? value : null);
  const id = value.id || sourceRecipe?.id;
  if (!id) return null;

  return {
    id,
    recipe: compactRecipe(sourceRecipe),
    banishedAt:
      typeof value.banishedAt === "number" ? value.banishedAt : null,
  };
};

const normalizeEntries = (values) => {
  const byId = new Map();

  for (const value of Array.isArray(values) ? values : []) {
    const entry = normalizeEntry(value);
    if (!entry) continue;

    const previous = byId.get(entry.id);
    // Prefer whichever duplicate has useful display data and a timestamp.
    byId.delete(entry.id);
    byId.set(entry.id, {
      id: entry.id,
      recipe: entry.recipe || previous?.recipe || null,
      banishedAt: entry.banishedAt ?? previous?.banishedAt ?? null,
    });
  }

  return [...byId.values()];
};

const readEntries = async () => {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    return normalizeEntries(raw ? JSON.parse(raw) : []);
  } catch {
    // Fail open: a damaged local store should never hide every dinner option.
    return [];
  }
};

const writeEntries = async (entries) => {
  try {
    await AsyncStorage.setItem(
      KEY,
      JSON.stringify(normalizeEntries(entries)),
    );
  } catch {
    // Best effort. A failed write means the change may not survive a restart.
  }
};

// A Set for O(1) filtering at spin time.
export const getBannedSet = async () =>
  new Set((await readEntries()).map((entry) => entry.id));

// Full entries for The Void, newest first. Legacy entries without timestamps
// remain visible at the end of the list as "previously banished".
export const getBanned = async () => {
  const entries = await readEntries();
  return entries
    .map((entry, index) => ({ entry, index }))
    .sort((a, b) => {
      const aTime = a.entry.banishedAt;
      const bTime = b.entry.banishedAt;
      if (aTime == null && bTime == null) return b.index - a.index;
      if (aTime == null) return 1;
      if (bTime == null) return -1;
      return bTime - aTime;
    })
    .map(({ entry }) => entry);
};

export const getBanCount = async () => (await readEntries()).length;

// 86 a recipe. Accepts the full recipe (preferred) or an ID for backwards
// compatibility. Returns the new total so the caller can choose a reaction.
export const banRecipe = async (recipeOrId) => {
  const recipe = compactRecipe(recipeOrId);
  const id = recipe?.id || (typeof recipeOrId === "string" ? recipeOrId : null);
  if (!id) return (await readEntries()).length;

  const entries = await readEntries();
  const existing = entries.find((entry) => entry.id === id);
  const next = entries.filter((entry) => entry.id !== id);

  next.push({
    id,
    recipe: recipe || existing?.recipe || null,
    banishedAt: existing?.banishedAt || Date.now(),
  });

  await writeEntries(next);
  return next.length;
};

// Forgive one recipe and bring it back into circulation.
export const unbanRecipe = async (id) => {
  const entries = (await readEntries()).filter((entry) => entry.id !== id);
  await writeEntries(entries);
  return entries.length;
};

// Release everything at once.
export const clearBannedRecipes = async () => {
  await writeEntries([]);
  return 0;
};

// Sticky flag: has the user ever completed a banish? Picks FIRST_BANISH copy on
// the very first one. Separate from the ban list (and from the tally below) so
// it stays true even after The Void is emptied.
const SEEN_KEY = "potluck_void_seen_v1";

export const hasBanishedBefore = async () => {
  try {
    return (await AsyncStorage.getItem(SEEN_KEY)) === "1";
  } catch {
    return false;
  }
};

export const markBanishedBefore = async () => {
  try {
    await AsyncStorage.setItem(SEEN_KEY, "1");
  } catch {
    // best effort — worst case the confirm shows once more
  }
};

export const isBanned = async (id) =>
  (await readEntries()).some((entry) => entry.id === id);

// ── Lifetime tally ────────────────────────────────────────────────────────────
// How many times you've ever 86'd something — NOT how many dishes the void
// currently holds. The reactions are written in lifetime voice ("Fate
// remembers", "I've stopped counting"), and milestones should land once ever,
// so pardoning a dish or emptying the void must not rewind the count.

const TALLY_KEY = "potluck_void_tally_v1";

export const getBanTally = async () => {
  try {
    const raw = await AsyncStorage.getItem(TALLY_KEY);
    if (raw != null) {
      const n = parseInt(raw, 10);
      if (Number.isFinite(n) && n >= 0) return n;
    }
  } catch {
    return 0;
  }

  // First read on an install that predates this key. The current void size is
  // the closest thing to a lifetime figure we have, so seed from it rather than
  // restarting a long-standing user at zero.
  try {
    return (await readEntries()).length;
  } catch {
    return 0;
  }
};

export const setBanTally = async (n) => {
  try {
    await AsyncStorage.setItem(TALLY_KEY, String(Math.max(0, n | 0)));
  } catch {
    // Best effort — worst case a milestone repeats after a restart.
  }
};
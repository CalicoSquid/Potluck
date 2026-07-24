// ── The Void (ban store) ──────────────────────────────────────────────────────
// Recipes you've 86'd, kept locally. A set of recipe IDs in AsyncStorage — no
// backend, no account. Spinnable pools filter against this before every spin.
// Fails open (empty void) on a read error so a broken store never hides dinner.
// Mirrors onboarding.js: KEY const, try/catch, screen stays orchestration-only.

import AsyncStorage from "@react-native-async-storage/async-storage";

const KEY = "potluck_void_v1";

// Internal: read the raw id array. Always returns an array.
const readIds = async () => {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
};

const writeIds = async (ids) => {
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify([...new Set(ids)]));
  } catch {
    // best-effort; a failed write just means the ban doesn't persist this run
  }
};

// A Set for O(1) filtering at spin time.
export const getBannedSet = async () => new Set(await readIds());

// The full ordered list (newest last) for The Void screen.
export const getBanned = async () => readIds();

export const getBanCount = async () => (await readIds()).length;

// 86 a recipe. Returns the new total count so the caller can pick a reaction.
export const banRecipe = async (id) => {
  const ids = await readIds();
  if (!ids.includes(id)) ids.push(id);
  await writeIds(ids);
  return ids.length;
};

// Forgive — bring one back from the void.
export const unbanRecipe = async (id) => {
  const ids = (await readIds()).filter((x) => x !== id);
  await writeIds(ids);
  return ids.length;
};

export const isBanned = async (id) => (await readIds()).includes(id);
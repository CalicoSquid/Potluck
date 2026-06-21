// ── Daily readings store ──────────────────────────────────────────────────────
// Potluck keeps one canonical "reading" per day — the universe's verdict.
// The first spin of a day sets it; only a committed pick ("Making this")
// overrides it. Entries fade after 7 days. Permanence is Savor's job; this
// is just a receipt that expires.

import AsyncStorage from "@react-native-async-storage/async-storage";

const KEY      = "potluck_readings_v1";
const MAX_DAYS = 7;

// Local-day key, e.g. "2026-6-21" → zero-padded for stable sorting/compare.
export const dayKey = (d = new Date()) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate(),
  ).padStart(2, "0")}`;

const loadRaw = async () => {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
};

// Midnight, (MAX_DAYS - 1) days ago → keeps today + the 6 prior days.
const cutoffTs = () => {
  const d = new Date();
  d.setDate(d.getDate() - (MAX_DAYS - 1));
  d.setHours(0, 0, 0, 0);
  return d.getTime();
};

const prune = (list) => {
  const min = cutoffTs();
  return list.filter((r) => typeof r?.ts === "number" && r.ts >= min && r?.recipe?.id);
};

const persist = (list) =>
  AsyncStorage.setItem(KEY, JSON.stringify(list)).catch(() => {});

// Pruned, newest-first. Also rewrites storage so expired entries actually go.
export const loadReadings = async () => {
  const list = prune(await loadRaw()).sort((a, b) => b.ts - a.ts);
  persist(list);
  return list;
};

export const getTodaysReading = async () => {
  const today = dayKey();
  return prune(await loadRaw()).find((r) => r.date === today) || null;
};

// Upsert today's entry.
//   • no entry yet         → create it (the canonical reading)
//   • entry exists, !commit → leave it (rerolls don't disturb the reading)
//   • commit === true       → overwrite (commitment beats fate)
export const setTodaysReading = async (recipe, { committed = false } = {}) => {
  if (!recipe?.id) return;
  const today = dayKey();
  const list  = prune(await loadRaw());
  const entry = list.find((r) => r.date === today);

  if (entry) {
    if (!committed) return;             // a reroll never overrides the reading
    entry.recipe    = recipe;
    entry.committed = true;
    entry.ts        = Date.now();
  } else {
    list.push({ date: today, ts: Date.now(), committed, recipe });
  }
  persist(list);
};
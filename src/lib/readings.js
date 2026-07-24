// ── Daily pick store ──────────────────────────────────────────────────────────
// Potluck persists exactly one thing: the dish you *lock in* each day. It pins
// tonight's dinner (reopen → land back on it) and feeds the fading "This Week"
// diary. Spins you never commit to aren't stored — fate is a moment, not a
// record. Entries fade after 7 days; permanence is Savor's job.

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

// The "This Week" diary — a record of what you committed to cook, newest-first.
// Only committed picks are ever stored (commitTodaysPick is the sole writer),
// so this is a diary of keepers, not a log of dishes you rerolled past and never
// made — which is the whole reason to send one to Savor. The committed filter is
// belt-and-braces; prune + persist still run so expired entries actually go.
export const loadReadings = async () => {
  const list = prune(await loadRaw()).sort((a, b) => b.ts - a.ts);
  persist(list);
  return list.filter((r) => r.committed);
};

// Today's locked-in pick, or null. Only committed picks are ever stored, so a
// non-null result here means "you committed to this dish today."
export const getTodaysReading = async () => {
  const today = dayKey();
  return prune(await loadRaw()).find((r) => r.date === today) || null;
};

// Commit today's pick — the dish you locked in to actually cook. One per day;
// locking a new one overwrites the last (commitment beats fate, and beats an
// earlier commitment too). This is the only writer: uncommitted spins never
// reach storage.
export const commitTodaysPick = async (recipe) => {
  if (!recipe?.id) return;
  const today = dayKey();
  const list  = prune(await loadRaw());
  const entry = list.find((r) => r.date === today);

  if (entry) {
    entry.recipe    = recipe;
    entry.committed = true;
    entry.ts        = Date.now();
  } else {
    list.push({ date: today, ts: Date.now(), committed: true, recipe });
  }
  persist(list);
};

// Un-commit today's pick — used when you 86 the very dish you'd locked in, so it
// doesn't resurface on reopen. Fate erased; nothing takes its place until you
// commit again.
export const clearTodaysPick = async () => {
  const today = dayKey();
  const list  = prune(await loadRaw()).filter((r) => r.date !== today);
  persist(list);
};
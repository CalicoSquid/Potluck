// ── Time helpers ──────────────────────────────────────────────────────────────
// One home for the recipe-time maths shared by SpinScreen and DoneScreen.

// A {hours, minutes} block → total minutes.
export const sumTime = (t) => (t ? (t.hours || 0) * 60 + (t.minutes || 0) : 0);

// Best-effort total for a recipe: prefer an explicit total, else prep + cook.
export const totalMins = (r) => {
  const tot = sumTime(r?.times?.total);
  if (tot) return tot;
  return sumTime(r?.times?.prep) + sumTime(r?.times?.cook);
};

// Minutes → "45 min" / "1h 20m" / "2h".
export const fmtMins = (m) =>
  m < 60
    ? `${m} min`
    : m % 60
      ? `${Math.floor(m / 60)}h ${m % 60}m`
      : `${Math.floor(m / 60)}h`;

// A recipe's total time, formatted — or null when unknown.
export const fmtTotal = (r) => {
  const m = totalMins(r);
  return m ? fmtMins(m) : null;
};

// Which mealtime are we in right now? Drives daypart-aware copy + the query.
export const daypartNow = () => {
  const h = new Date().getHours();
  return h >= 5 && h < 11 ? "breakfast" : "dinner";
};

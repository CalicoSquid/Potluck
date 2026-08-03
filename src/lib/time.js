// ── Time helpers ──────────────────────────────────────────────────────────────
// One home for the recipe-time maths shared by SpinScreen and DoneScreen.

// Scraped time data is not trustworthy. We've seen negative minutes
// (-4564786564) leak through from a bad upstream parse, and a bad ISO-8601
// duration can just as easily produce a NaN or an absurd positive. Every raw
// hours/minutes value passes through here before it's allowed to become UI.
//   • must be a finite number
//   • must be positive (0 and negatives collapse to 0)
//   • must be under 10,000 of its own unit — nothing real is 10k hours
export const cleanUnit = (n) =>
  Number.isFinite(n) && n > 0 && n < 1e4 ? Math.floor(n) : 0;

// Anything past two days is a scrape artefact, not a brisket. Treated as
// unknown rather than shown, because a wrong time is worse than no time.
export const MAX_SANE_MINS = 2880;

// A {hours, minutes} block → total minutes.
export const sumTime = (t) =>
  t ? cleanUnit(t.hours) * 60 + cleanUnit(t.minutes) : 0;

// Best-effort total for a recipe: prefer an explicit total, else prep + cook.
// Returns 0 when the result is unknown *or* obviously bogus.
export const totalMins = (r) => {
  const tot = sumTime(r?.times?.total);
  const m = tot || sumTime(r?.times?.prep) + sumTime(r?.times?.cook);
  return m > MAX_SANE_MINS ? 0 : m;
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
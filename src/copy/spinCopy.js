// ── Spin screen copy pools ────────────────────────────────────────────────────
// All user-facing strings for SpinScreen live here — easy to edit without
// touching component logic.

export const IDLE_HEADLINES = [
  "Spin For Your Supper!",
  "What's on the menu?",
  "Feeling lucky, chef?",
  "Leave it to fate.",
  "Let the wheel decide.",
  "No plans? No problem.",
];

export const IDLE_SUBLINES = [
  "No scrolling. No deciding. Just cook.",
  "One spin. One recipe. Done.",
  "The universe picked it. You cook it.",
  "Dinner sorted in seconds.",
];

export const MID_HEADLINES = [
  "Not feeling it?",
  "Uninspired?",
  "Not quite right?",
  "Keep going?",
  "Nearly there.",
];

export const MID_SUBLINES = (n) => [
  `${n} spin${n === 1 ? "" : "s"} left — make it count.`,
  `${n} more. Choose wisely.`,
  `${n} left. No pressure.`,
];

export const CAP_HEADLINES = [
  "That's your three.",
  "Three spins. That's the deal.",
  "The wheel has spoken.",
  "Alright, you've seen enough.",
];

export const CAP_CHEEKS = [
  "Surely one of those will do?",
  "The wheel tried its best.",
  "Three great options right there.",
  "You dare defy the universe?",
];

// ── Reset modal copy ──────────────────────────────────────────────────────────

export const RESET_HEADLINES = [
  "Throwing it all away?",
  "Walking away from these?",
  "Really? These look great.",
  "Starting fresh, are we?",
];

export const RESET_SUBS = [
  "Save any of these to Savor first — they're gone if you reset.",
  "These recipes don't come back. Save a favourite to Savor before you bail.",
  "Once you reset, the wheel forgets everything. Worth saving one first?",
  "The wheel has no memory. Save to Savor, then reset guilt-free.",
];

export const RESET_CONFIRM = [
  "Yeah, spin again",
  "Ditch them and spin",
  "Fresh spin, please",
  "Reset, I'm sure",
];

export const RESET_CANCEL = [
  "Actually, keep them",
  "Wait, I'll stay",
  "No, hold on",
  "Keep my recipes",
];

// ── Utility ───────────────────────────────────────────────────────────────────

export const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
// ── Spin copy ─────────────────────────────────────────────────────────────────
// All the wheel's voice lives here: idle prompts, reveal verdicts, the contextual
// verdict pools, and the reroll labels. Pulled out of SpinScreen so the screen is
// orchestration and the words are easy to find and tweak.

import { totalMins, daypartNow } from "./time";

export const pick = (a) => a[Math.floor(Math.random() * a.length)];

export const IDLE_HEADLINES = [
  "Let the universe decide.",
  "What's for dinner?",
  "Leave it to fate.",
  "Hungry? Spin.",
];

export const IDLE_SUBLINES = [
  "No scrolling. No deciding. Just cook.",
  "One spin. Dinner sorted.",
  "The wheel knows.",
];

export const REVEAL_SUBLINES = [
  "The universe has spoken.",
  "No notes. Go cook.",
  "This is what you're having.",
  "Settled. Get the pan out.",
  "Argue with it later.",
  "Resistance is futile. Also delicious.",
  "That's dinner. No appeals.",
  "Don't make it weird. Just cook it.",
  "Decided. Off you go.",
  "Bold. Go with it.",
  "That's the one. Trust it.",
  "Cook it. Don't overthink it.",
  "You'll thank fate for this one.",
  "This one's a keeper. Move.",
  "Fate's made the call. Honour it.",
  "Stop scrolling. Start cooking.",
  "It's chosen. You're cooking.",
  "Good luck doing better.",
];

// Contextual verdict pools — flavour that nods to what actually landed.
const DESSERT_LINES = [
  "Dessert. No notes.",
  "The universe wants you to have cake.",
  "Straight to the good part, then.",
  "Pudding counts as dinner. Officially, now.",
];
const BAKING_LINES = [
  "Get the oven on.",
  "Baking it is. Mind the timer.",
  "Flour everywhere by tonight. Worth it.",
];
const BRINNER_LINES = [
  "Breakfast. For dinner. The universe insists.",
  "Eggs after dark. Why not.",
  "Brinner. The wheel's feeling chaotic.",
];
const QUICK_LINES = [
  "Quick one. You'll barely notice.",
  "On the table before you change your mind.",
  "Fast. The universe respects your time.",
];
const SLOW_LINES = [
  "Clear the evening — this one takes a while.",
  "A project. The universe believes in you.",
  "Low and slow. Pour something.",
];

export const REROLL_LABELS = [
  "Not feeling it? Spin again",
  "Again? Go on then",
  "The universe is patient…",
  "Truly? Once more",
  "…you're impossible",
  "Fine. Spin. (it was right the first time)",
];

const lc = (s) => (typeof s === "string" ? s.toLowerCase() : "");
const hasAny = (hay, words) => words.some((w) => hay.includes(w));

// Sometimes the verdict reflects what landed; otherwise a plain fate line —
// kept ~60/40 so the nod stays a surprise rather than a pattern.
export const verdictFor = (recipe) => {
  const hay = `${lc(recipe?.category)} ${lc(recipe?.cuisine)} ${lc(recipe?.name)}`;
  const mins = totalMins(recipe);
  const pools = [];

  if (
    hasAny(hay, [
      "dessert",
      "cake",
      "cookie",
      "brownie",
      "pastry",
      "pie",
      "muffin",
      "tart",
      "pudding",
      "cheesecake",
      "cupcake",
      "doughnut",
      "donut",
      "sweet",
    ])
  ) {
    pools.push(DESSERT_LINES);
  } else if (
    hasAny(hay, [
      "bread",
      "loaf",
      "bake",
      "scone",
      "biscuit",
      "focaccia",
      "bagel",
    ])
  ) {
    pools.push(BAKING_LINES);
  }

  if (
    daypartNow() === "dinner" &&
    hasAny(hay, [
      "breakfast",
      "brunch",
      "pancake",
      "waffle",
      "omelette",
      "omelet",
      "porridge",
      "granola",
      "french toast",
      "cereal",
    ])
  ) {
    pools.push(BRINNER_LINES);
  }

  if (mins && mins <= 20) pools.push(QUICK_LINES);
  else if (mins && mins >= 90) pools.push(SLOW_LINES);

  if (pools.length && Math.random() < 0.6) return pick(pick(pools));
  return pick(REVEAL_SUBLINES);
};

// ── 86 reactions ──────────────────────────────────────────────────────────────
// When you 86 a recipe you're overruling the universe's pick — so the universe
// takes it personally, and takes it *more* personally the more you do it. All the
// cosmic-narrator voice for banning lives here; the screen just asks for a line.
// Deadpan, petty, mildly wounded — never shouty. The restraint is the joke.

import { pick } from "./spinCopy";

// `{n}` is filled with the running ban tally where a line wants to keep score.
const fill = (line, n) => line.replace("{n}", String(n));

// Tier 1 — mildly affronted (bans 1–4). Works at any low count; number-free.
const AFFRONTED = [
  "86'd. The universe notes your defiance.",
  "Rejected. Bold, for someone who asked me to choose.",
  "Gone. One less star in the sky. Happy?",
  "Banished to the walk-in. The universe sighs.",
  "Struck from the menu. I had my reasons, you know.",
  "Dead to you, chef. Noted.",
];

// Tier 2 — taking it personally (bans 5–9).
const PERSONAL = [
  "Another? You do remember asking me to pick.",
  "The cosmos is beginning to doubt your commitment to dinner.",
  "That's {n} now. The universe is keeping a list.",
  "Fine. It's off the reel. I won't forget this.",
  "You and I are going to have words about your standards.",
];

// Tier 3 — mock-wounded (bans 10–19).
const WOUNDED = [
  "{n} banished. This is starting to feel personal.",
  "At this point I'm suggesting things just to watch you say no.",
  "The universe has feelings, you know.",
  "Cast out. I'm not angry, I'm disappointed. Mostly angry.",
  "Do you 86 everything, or just the things I love?",
];

// Tier 4 — resigned / petty-grand (bans 20+).
const RESIGNED = [
  "{n} gone. The universe has stopped taking it personally. Mostly.",
  "Another one to the pile. I've stopped counting. (I haven't.)",
  "Banished. You've defied fate {n} times. Fate remembers.",
  "Sure. Why not. It's not like I chose it for a reason.",
  "The universe respects your ruthlessness. Grudgingly.",
];

// Exact-count milestone beats — fire once, for the moment.
const MILESTONES = {
  1:  "First blood. The universe raises an eyebrow.",
  5:  "That's five. The universe is officially keeping score.",
  10: "Ten banished. You monster. (Respect.)",
  25: "Twenty-five. There's a special shelf in the void for you.",
  50: "Fifty. The universe has written a strongly-worded letter.",
};

const tierFor = (n) =>
  n >= 20 ? RESIGNED : n >= 10 ? WOUNDED : n >= 5 ? PERSONAL : AFFRONTED;

// `count` = total bans INCLUDING this one (first ban -> 1).
export const banReactionFor = (count) => {
  const n = Math.max(1, count | 0);
  const line = MILESTONES[n] || pick(tierFor(n));
  return fill(line, n);
};

// Shown when there's nothing left to spin — you've 86'd the lot.
const BANISHED_ALL = [
  "You've 86'd everything. The universe surrenders. Cook what you like — clearly my opinion means nothing.",
  "Nothing left on the reel. Congratulations, you've out-stubborned fate.",
  "The void is full and the menu is empty. This one's on you, chef.",
];
export const banishedAllLine = () => pick(BANISHED_ALL);

// Copy for the "The Void" settings screen where bans live (and can be forgiven).
export const VOID_TITLE = "The Void";
export const VOID_SUBTITLE = "Everything you've cast out. The universe remembers.";
export const voidTallyLine = (n) =>
  n === 0
    ? "You've defied the universe exactly zero times. Suspicious."
    : `You've defied the universe ${n} ${n === 1 ? "time" : "times"}.`;
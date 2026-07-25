// ── 86 reactions ──────────────────────────────────────────────────────────────
// When you 86 a recipe you're overruling the universe's pick — so the universe
// takes it personally, and takes it *more* personally the more you do it. All the
// cosmic-narrator voice for banning lives here; the screen just asks for a line.
//
// Voice note: first person, present tense, reacting in the moment. Third-person
// narration ("the universe sighs") describes a feeling from a safe distance;
// "I picked that one specially" *has* the feeling. FIRST_BANISH sets the pitch —
// startled, wounded, slightly undignified — and the tiers wear it down from
// there. Still never shouty. The restraint is still the joke; it just cracks.

import { pick } from "./spinCopy";

// `{n}` is filled with the running ban tally where a line wants to keep score.
const fill = (line, n) => line.replace("{n}", String(n));

// Tier 1 — genuinely startled (bans 1–4). Number-free; works at any low count.
const AFFRONTED = [
  "You— no. That was a perfectly good dish.",
  "You're joking. I picked that one specially.",
  "Gone, then. One less star in the sky. Happy?",
  "I'm sorry, you did what to it?",
  "Right. Struck from the menu. I had my reasons, you know.",
  "Banished to the walk-in. I hope you're pleased with yourself.",
  "Dead to you, chef. Noted. Loudly.",
];

// Tier 2 — frustrated, taking it personally (bans 5–9).
const PERSONAL = [
  "Again? You asked me to choose. You literally asked.",
  "I'm beginning to doubt your commitment to dinner.",
  "That's {n}. I'm keeping a list, and you're on it.",
  "Fine. Off the reel. I won't forget this.",
  "You and I need to talk about your standards.",
  "Would you rather I just stopped suggesting things?",
];

// Tier 3 — exasperated, mock-wounded (bans 10–19).
const WOUNDED = [
  "{n} banished. This is starting to feel personal.",
  "At this point I'm suggesting things just to watch you say no.",
  "Unbelievable. That was one of the good ones.",
  "I'm not angry. I'm disappointed. Mostly angry.",
  "Do you 86 everything, or just the things I love?",
  "{n}. I have feelings, you know. Allegedly.",
];

// Tier 4 — worn down, petty-grand (bans 20+).
const RESIGNED = [
  "{n} gone. I've stopped taking it personally. Mostly.",
  "Another for the pile. I've stopped counting. (I haven't.)",
  "You've defied me {n} times. I'm aware of the number.",
  "Sure. Why not. It's not like I chose it for a reason.",
  "Take it. Take them all. I'll be here.",
  "Ruthless. I'd admire it if it weren't aimed at me.",
];

// Exact-count milestone beats — fire once, for the moment.
// NOTE: 1 is effectively unreachable — the first banish always gets
// FIRST_BANISH instead. It only surfaces on installs that had already banished
// before the lifetime tally existed. Kept as a safety net, not a feature.
const MILESTONES = {
  1:  "First blood. I saw that.",
  5:  "That's five. I'm officially keeping score.",
  10: "Ten. Ten! You monster. (Respect.)",
  25: "Twenty-five. There's a special shelf in the void for you.",
  50: "Fifty. I've written a strongly-worded letter.",
};

const tierFor = (n) =>
  n >= 20 ? RESIGNED : n >= 10 ? WOUNDED : n >= 5 ? PERSONAL : AFFRONTED;

// `count` = lifetime bans INCLUDING this one (first ban -> 1).
// The one-time "oh no, what have I done" — shown under the reel the very first
// time you banish anything. Regret, played for a chuckle. It IS the teaching.
export const FIRST_BANISH =
  "Why would you press that?! Now it’s gone forever. …Kind of.";

export const banReactionFor = (count) => {
  const n = Math.max(1, count | 0);
  const line = MILESTONES[n] || pick(tierFor(n));
  return fill(line, n);
};

// Shown when there's nothing left to spin — you've 86'd the lot.
const BANISHED_ALL = [
  "You've 86'd everything. I surrender. Cook what you like — clearly my opinion means nothing.",
  "Nothing left on the reel. Congratulations, you've out-stubborned fate.",
  "The void is full and the menu is empty. This one's on you, chef.",
];
export const banishedAllLine = () => pick(BANISHED_ALL);

// Copy for "The Void", where bans live (and can be forgiven).
export const VOID_TITLE = "The Void";
export const VOID_SUBTITLE = "Everything you've cast out. I remember all of it.";
export const voidTallyLine = (n) =>
  n === 0
    ? "You've defied me exactly zero times. Suspicious."
    : `You've defied me ${n} ${n === 1 ? "time" : "times"}.`;
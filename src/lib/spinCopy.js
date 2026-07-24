// ── Spin copy ─────────────────────────────────────────────────────────────────
// Potluck's voice lives here: idle prompts, spin chatter, reveal verdicts,
// contextual verdict pools, and reroll labels.
//
// Voice: cosmic authority, weary omnipotence, lightly annoyed dinner oracle.

import { totalMins, daypartNow } from "./time";

// Avoid recently used lines from the same permanent pool.
// History lasts for the current JS session and resets when the app restarts.
const recentByPool = new WeakMap();

export const pick = (pool, historySize = 3) => {
  if (!Array.isArray(pool) || pool.length === 0) return "";

  const recent = recentByPool.get(pool) ?? [];
  const fresh = pool.filter((item) => !recent.includes(item));
  const candidates = fresh.length ? fresh : pool;

  const chosen = candidates[Math.floor(Math.random() * candidates.length)];

  const maxHistory = Math.min(
    historySize,
    Math.max(0, pool.length - 1)
  );

  recentByPool.set(
    pool,
    [chosen, ...recent.filter((item) => item !== chosen)].slice(0, maxHistory)
  );

  return chosen;
};

export const IDLE_HEADLINES = [
  "Let the universe decide.",
  "What's for dinner?",
  "Leave it to fate.",
  "Hungry? Spin.",
  "Consult the cosmos.",
  "Summon dinner.",
  "Hand it over to destiny.",
  "Ask the wheel.",
  "Dinner requires intervention.",
  "Let fate check the recipe box.",
  "Your indecision has been noticed.",
  "The stars are taking requests.",
  "Spin before you order something regrettable.",
  "A higher power is available.",
  "The universe has opinions.",
  "Destiny is waiting.",
  "Enough deliberation.",
  "Let's settle this cosmically.",
];

export const IDLE_SUBLINES = [
  "No scrolling. No deciding. Just cook.",
  "One spin. Dinner sorted.",
  "The wheel knows.",
  "Your recipes. My problem now.",
  "The cosmos hates indecision.",
  "Ask once. Cook what you're given.",
  "One spin. Zero committee meetings.",
  "Cosmic customer service is now open.",
  "Hand over control. Briefly.",
  "The stars have seen your recipe box.",
  "Let destiny do the admin.",
  "Spin the wheel. Accept the consequences.",
  "No lists. No debates. No appeals.",
  "Someone saved these recipes. I'll choose one.",
  "The universe is ready when you are.",
  "Dinner will not choose itself. Apparently.",
];

// Optional: useful beneath the wheel while the spin animation is running.
export const SPINNING_LINES = [
  "Consulting the stars…",
  "Collapsing timelines…",
  "Reviewing your questionable options…",
  "Asking the void…",
  "Processing destiny…",
  "Moving several celestial bodies…",
  "Submitting dinner for cosmic approval…",
  "Checking alternate realities…",
  "Ignoring your previous preferences…",
  "Summoning an answer…",
  "Shuffling the prophecy…",
  "Aligning the cutlery…",
  "Requesting guidance from Saturn…",
  "Eliminating inferior timelines…",
  "Preparing a legally binding verdict…",
  "The oracle is thinking…",
  "Searching the edible multiverse…",
  "Fate is loading. Be patient.",
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

  "Cosmic admin has approved this meal.",
  "The stars aligned. Against their better judgement.",
  "Your dinner request has been processed.",
  "Fate has closed the case.",
  "Decision issued. Appeals unavailable.",
  "This survived celestial review.",
  "I checked the timelines. This one's best.",
  "An omen, but the tasty kind.",
  "The prophecy says preheat the oven.",
  "The universe has done its bit. Your turn.",
  "Do not ask the moon for a second opinion.",
  "I have spoken. Find a chopping board.",
  "Destiny says mise en place.",
  "Cook first. Question reality later.",
  "That pause was the cosmos judging you.",
  "Chosen with almost no bias.",
  "This is canon now.",
  "Tonight's timeline contains this.",
  "There is no multiverse where you keep scrolling.",
  "I've collapsed the possibilities. You're welcome.",
  "One timeline. One dinner.",
  "Behold: the least complicated future.",
  "The cosmic wheel remains undefeated.",
  "Trust the process. The process is a wheel.",
  "You outsourced dinner to fate. Fate delivered.",
  "Stop looking at the other recipes.",
  "The stars say yes. The fridge may vary.",
  "Your destiny smells good, apparently.",
  "A powerful choice made by absolutely no one.",
  "I did not move the heavens for you to ignore this.",
  "Take the hint, mortal.",
  "Cook it before I reconsider.",
  "That's the answer. Leave the oracle alone.",
  "Result final. The universe is closing early.",
  "Kitchen. Now.",
  "Enough democracy.",
  "Dinner has been assigned.",
  "Your evening now has a plot.",
  "There. A decision. Remember those?",
  "Do not reopen the case.",
  "The matter is cosmically settled.",
  "Fate picked it. Blame fate.",
  "You're welcome, indecisive one.",
  "Dinner by celestial decree.",
  "The stars cannot chop the onions for you.",
  "The universe provides direction, not prep.",
  "Your part starts now.",
  "Verdict delivered. Apron optional.",
  "This is what all that spinning was for.",
  "The oracle recommends immediate compliance.",
  "Destiny has completed the paperwork.",
  "The cosmos considers the matter resolved.",
  "Dinner has entered the official timeline.",
  "Your request for food has been granted.",
  "The wheel chose wisely. Probably.",
  "A perfectly adequate prophecy.",
  "The stars were surprisingly specific.",
  "This outcome is cosmically binding.",
  "Proceed directly to the kitchen.",
  "The universe refuses to elaborate.",
  "You wanted an answer. There it is.",
  "I have selected your evening's main quest.",
];

// These work well in sequence, becoming increasingly irritated with each reroll.
export const REROLL_LABELS = [
  "Not feeling it? Spin again",
  "Questioning destiny already?",
  "Fine. Request a recount",
  "The stars will check again",
  "Another timeline, then",
  "You will make me cry...",
  "No? You're testing fate",
  "Cosmic patience is finite",
  "You are making this weird",
  "The universe remembers",
  "…you're impossible",
  "Last chance, mortal",
  "Fine. Spin.",
];

// ── Contextual verdict pools ──────────────────────────────────────────────────

const DESSERT_LINES = [
  "Dessert. No notes.",
  "The universe wants you to have cake.",
  "Straight to the good part, then.",
  "Pudding counts as dinner. Officially, now.",
  "The universe has abandoned restraint.",
  "Dinner has frosting now.",
  "Apparently we're skipping to the reward.",
  "Nutrition declined to comment.",
  "Sweet destiny. Literally.",
  "Cosmic ruling: dessert.",
  "Pudding has won the argument.",
  "The stars have a sweet tooth.",
  "We both know this is why you spun.",
  "Main-course status: revoked.",
];

const BAKING_LINES = [
  "Get the oven on.",
  "Baking it is. Mind the timer.",
  "Flour everywhere by tonight. Worth it.",
  "Preheat. Fate hates waiting.",
  "Flour the surface. And probably yourself.",
  "The universe requests accurate measurements for once.",
  "This one comes with dough-based consequences.",
  "Activate the oven. The prophecy is rising.",
  "Time to make the kitchen look suspicious.",
  "Your future contains crumbs.",
  "Proofing is just waiting with purpose.",
  "The cosmos says do not open the oven door.",
  "Butter has entered the timeline.",
];

const BRINNER_LINES = [
  "Breakfast. For dinner. The universe insists.",
  "Eggs after dark. Why not.",
  "Brinner. The wheel's feeling chaotic.",
  "Breakfast crossed a boundary. Good.",
  "The sun is down. The eggs remain.",
  "Time is a construct. Make pancakes.",
  "Breakfast has filed for evening access.",
  "Tonight's dinner wears pyjamas.",
  "Cereal would be cowardice. Cook.",
  "Brinner approved by cosmic loophole.",
  "Morning food. Night rules.",
  "The universe rejects meal-time orthodoxy.",
  "Eggs do not own a clock.",
];

const QUICK_LINES = [
  "Quick one. You'll barely notice.",
  "On the table before you change your mind.",
  "Fast. The universe respects your time.",
  "Fast enough to outrun second thoughts.",
  "Twenty minutes. Try not to complicate it.",
  "The universe has spared your evening.",
  "Minimal time. Maximum smugness.",
  "Quick. Before motivation expires.",
  "This is practically instant by mortal standards.",
  "Even your excuses take longer.",
  "Low commitment. High dinner.",
  "You can survive twenty minutes.",
  "The cosmos has other appointments.",
];

const SLOW_LINES = [
  "Clear the evening — this one takes a while.",
  "A project. The universe believes in you.",
  "Low and slow. Pour something.",
  "Cancel your tiny plans.",
  "This is dinner with a side quest.",
  "Long cook. Excellent excuse to hover.",
  "Tonight, patience is an ingredient.",
  "Low and slow. Like cosmic bureaucracy.",
  "The universe has assigned you a project.",
  "Settle in. This has chapters.",
  "Your evening belongs to the pot now.",
  "Time will pass either way.",
  "This is not fast food. It knows that.",
];

const PASTA_LINES = [
  "Boil water. The rest is destiny.",
  "The universe has chosen carbohydrates.",
  "Salt the water like you mean it.",
  "Your future is pleasantly tangled.",
  "Somewhere, a colander feels needed.",
  "Carbs have won. Again.",
  "Fate says al dente.",
  "Twirl first. Reflect later.",
  "Tonight's answer is mostly noodles.",
  "The stars are starch-based.",
  "The prophecy requires parmesan.",
];

const SOUP_LINES = [
  "The universe recommends a bowl.",
  "Liquid dinner. Solid decision.",
  "Warm, forgiving, difficult to argue with.",
  "Get the big pot. Fate is brothy.",
  "A spoon has been summoned.",
  "The cosmos has chosen comfort in a bowl.",
  "Simmering is now your personality.",
  "Tonight, we drink the meal politely.",
  "Broth before existential thought.",
  "The stars say slurp.",
  "Destiny appears to be steaming.",
];

const SPICY_LINES = [
  "The universe chose violence. Delicious violence.",
  "Your dinner has a warning label.",
  "Fate brought heat.",
  "Prepare to negotiate with your taste buds.",
  "The cosmos would like to see you sweat.",
  "Bold choice. Keep water nearby.",
  "Tonight's prophecy is pepper-shaped.",
  "Spice has entered the timeline.",
  "Your future is warm around the edges.",
  "The stars said extra chilli.",
  "Cosmic fire. Sensible portions.",
];

const SALAD_LINES = [
  "The universe remembers vegetables.",
  "Look at you, being responsible accidentally.",
  "Fresh, crisp, cosmically approved.",
  "Apparently fate wants crunch.",
  "Green things have won the lottery.",
  "The stars request something leafy.",
  "A suspiciously sensible outcome.",
  "Virtue, but with dressing.",
  "The universe selected balance. Rude.",
  "Fine. We're being healthy.",
];

const GRILL_LINES = [
  "Apply fire. Become powerful.",
  "The universe has granted you flame.",
  "Char marks are part of the prophecy.",
  "Outside. Fire. Dinner. Ancient wisdom.",
  "Fate says grill it.",
  "Smoke is now a seasoning.",
  "Tongs at the ready.",
  "The stars want this slightly charred.",
  "Your ancestors approve.",
  "Cook it over fire like the cosmos intended.",
];

const CHEESE_LINES = [
  "The universe has chosen dairy-based peace.",
  "Cheese has resolved the matter.",
  "Your fate is melty.",
  "Cosmic law permits extra cheese.",
  "Tonight's answer stretches when lifted.",
  "Dairy has seized control.",
  "The stars say grate generously.",
  "This timeline is better with cheese.",
  "Cheese: the oldest form of diplomacy.",
  "Fate wants it bubbling.",
];

const ONE_POT_LINES = [
  "One pot. Minimal evidence.",
  "The universe has reduced the washing up.",
  "Everything goes in. Chaos becomes dinner.",
  "Fate supports fewer dishes.",
  "One pan to rule your evening.",
  "The cosmos has shown mercy to the sink.",
  "Low-washing-up timeline selected.",
  "Throw it together. Pretend it was strategy.",
  "Maximum dinner. Minimum crockery.",
  "The stars have spared your dishwasher.",
];

const COMFORT_LINES = [
  "Fate prescribed comfort.",
  "The universe says you've done enough today.",
  "Soft, warm, and difficult to regret.",
  "Tonight's decision comes with emotional support.",
  "Cosmic blanket food.",
  "This is what bowls were invented for.",
  "The stars recommend seconds.",
  "Comfort has been officially authorised.",
  "Your evening just got softer.",
  "Eat this somewhere comfortable.",
];

const SEAFOOD_LINES = [
  "The tide has spoken.",
  "The universe says seafood.",
  "Something from the sea has won.",
  "Tonight's fate comes with lemon.",
  "The ocean has entered the timeline.",
  "A suspiciously nautical prophecy.",
  "The stars recommend something coastal.",
  "Destiny smells faintly of the sea.",
];

const VEGGIE_LINES = [
  "Plants have seized the narrative.",
  "The garden has entered the chat.",
  "Fate says eat something green.",
  "The universe has gone herbaceous.",
  "Vegetables, but make them destiny.",
  "The cosmos approves of chlorophyll.",
  "Tonight, the plants win.",
  "A garden-forward prophecy.",
];

// ── Matching helpers ──────────────────────────────────────────────────────────

const lc = (value) =>
  typeof value === "string" ? value.toLowerCase() : "";

const hasAny = (haystack, words) =>
  words.some((word) => haystack.includes(word));

const SAVOURY_PIE_WORDS = [
  "shepherd's pie",
  "shepherds pie",
  "cottage pie",
  "pot pie",
  "chicken pie",
  "meat pie",
  "steak pie",
  "fish pie",
  "mince pie", // Remove this one if your mince pies are always sweet.
];

// ── Verdict selection ─────────────────────────────────────────────────────────

// Usually reflects what landed, but sometimes returns a general fate line.
// Context is intentionally probabilistic so it remains surprising.
export const verdictFor = (recipe) => {
  const hay = [
    lc(recipe?.category),
    lc(recipe?.cuisine),
    lc(recipe?.name),
  ].join(" ");

  const mins = totalMins(recipe);
  const pools = [];

  const isSavouryPie = hasAny(hay, SAVOURY_PIE_WORDS);

  const isDessert =
    hasAny(hay, [
      "dessert",
      "cake",
      "cookie",
      "brownie",
      "pastry",
      "muffin",
      "tart",
      "pudding",
      "cheesecake",
      "cupcake",
      "doughnut",
      "donut",
      "sweet",
      "frosting",
      "icing",
      "chocolate",
      "custard",
      "crumble",
      "cobbler",
      "gelato",
      "ice cream",
    ]) ||
    (hay.includes("pie") && !isSavouryPie);

  const isBaking = hasAny(hay, [
    "bread",
    "loaf",
    "scone",
    "biscuit",
    "focaccia",
    "bagel",
    "brioche",
    "sourdough",
    "dough",
    "bread roll",
    "dinner roll",
  ]);

  if (isDessert) {
    pools.push(DESSERT_LINES);
  } else if (isBaking) {
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
      "fried egg",
      "scrambled egg",
    ])
  ) {
    pools.push(BRINNER_LINES);
  }

  if (
    hasAny(hay, [
      "pasta",
      "spaghetti",
      "linguine",
      "penne",
      "rigatoni",
      "ravioli",
      "tortellini",
      "lasagne",
      "lasagna",
      "gnocchi",
      "macaroni",
      "noodle",
      "tagliatelle",
      "fettuccine",
    ])
  ) {
    pools.push(PASTA_LINES);
  }

  if (
    hasAny(hay, [
      "soup",
      "broth",
      "chowder",
      "bisque",
      "ramen",
      "pho",
      "stew",
    ])
  ) {
    pools.push(SOUP_LINES);
  }

  if (
    hasAny(hay, [
      "spicy",
      "chilli",
      "chili",
      "jalapeño",
      "jalapeno",
      "harissa",
      "sriracha",
      "hot sauce",
      "cajun",
      "buffalo",
      "gochujang",
    ])
  ) {
    pools.push(SPICY_LINES);
  }

  if (
    hasAny(hay, [
      "salad",
      "slaw",
      "tabbouleh",
      "tabbouli",
      "greens",
    ])
  ) {
    pools.push(SALAD_LINES);
  }

  if (
    hasAny(hay, [
      "grilled",
      "grill",
      "barbecue",
      "barbeque",
      "bbq",
      "kebab",
      "skewer",
      "chargrilled",
      "char-grilled",
    ])
  ) {
    pools.push(GRILL_LINES);
  }

  if (
    hasAny(hay, [
      "cheese",
      "cheesy",
      "mozzarella",
      "cheddar",
      "parmesan",
      "halloumi",
      "fondue",
      "gruyere",
      "gruyère",
    ])
  ) {
    pools.push(CHEESE_LINES);
  }

  if (
    hasAny(hay, [
      "one pot",
      "one-pot",
      "one pan",
      "one-pan",
      "sheet pan",
      "traybake",
      "tray bake",
      "skillet",
    ])
  ) {
    pools.push(ONE_POT_LINES);
  }

  if (
    hasAny(hay, [
      "casserole",
      "shepherd's pie",
      "shepherds pie",
      "cottage pie",
      "pot pie",
      "meatloaf",
      "mashed potato",
      "mac and cheese",
      "macaroni cheese",
      "gravy",
      "dumpling",
      "hotpot",
    ])
  ) {
    pools.push(COMFORT_LINES);
  }

  if (
    hasAny(hay, [
      "fish",
      "salmon",
      "tuna",
      "cod",
      "haddock",
      "prawn",
      "shrimp",
      "crab",
      "lobster",
      "mussel",
      "clam",
      "seafood",
    ])
  ) {
    pools.push(SEAFOOD_LINES);
  }

  if (
    hasAny(hay, [
      "vegetarian",
      "vegan",
      "vegetable",
      "veggie",
      "aubergine",
      "eggplant",
      "courgette",
      "zucchini",
      "cauliflower",
      "broccoli",
      "lentil",
      "chickpea",
      "tofu",
    ])
  ) {
    pools.push(VEGGIE_LINES);
  }

  if (mins && mins <= 20) {
    pools.push(QUICK_LINES);
  } else if (mins && mins >= 90) {
    pools.push(SLOW_LINES);
  }

  // A contextual response appears often enough to feel intelligent,
  // but not so often that its behaviour becomes predictable.
  if (pools.length && Math.random() < 0.65) {
    const selectedPool = pools[Math.floor(Math.random() * pools.length)];
    return pick(selectedPool);
  }

  return pick(REVEAL_SUBLINES);
};
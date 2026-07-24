// ── Ingredient parsing ────────────────────────────────────────────────────────
export const UNITS = new Set([
  "cup","cups","c","tbsp","tablespoon","tablespoons","tsp","teaspoon","teaspoons",
  "oz","ounce","ounces","lb","lbs","pound","pounds","g","gram","grams","kg",
  "ml","l","litre","litres","liter","liters","pint","pints","quart","quarts",
  "gallon","gallons","fl","clove","cloves","slice","slices","piece","pieces",
  "sprig","sprigs","bunch","handful","pinch","dash","drop","can","cans","jar",
  "jars","package","pkg","bag","stick","head","stalk","stalks","sheet","tin","tins",
]);

// Short units we re-glue to their number in the qty label ("400 g" -> "400g").
const TIGHT_UNITS = new Set(["g","kg","ml","l","oz","lb","lbs","fl"]);

// Connectors that live *inside* a quantity block (ranges, multipliers, dual measures).
const QTY_CONNECTORS = new Set(["x","×","to","/","+","plus","&","and","-","–"]);

const FRAC_CHARS = "½⅓⅔¼¾⅕⅖⅗⅘⅙⅚⅛⅜⅝⅞";
const isNumberish = (t) =>
  new RegExp(`^[0-9${FRAC_CHARS}]+([./][0-9]+)?$`).test(t);
const isUnit = (t) => UNITS.has(t.toLowerCase().replace(/\.$/, ""));

// Prep/size words safe to strip from a *name* (leading or trailing) without
// changing what you'd actually buy. Deliberately EXCLUDES product-defining
// words like "ground", "whole", "dried", "smoked" — "ground beef" != "beef".
const STRIP_WORDS = new Set([
  "chopped","minced","sliced","diced","grated","shredded","crushed","mashed",
  "finely","roughly","thinly","thickly","coarsely","freshly","lightly",
  "peeled","seeded","deseeded","cored","pitted","halved","quartered","cubed",
  "julienned","torn","trimmed","softened","melted","beaten","whisked","sifted",
  "drained","rinsed","divided","packed","fresh","large","medium","small","big",
  "tiny","jumbo","extra","boneless","skinless","each",
]);

// Filler words ignored when deciding if a comma-segment is "just prep".
const FILLER = new Set(["and","&","or","to","for","until","then","plus","more",
  "extra","well","very","about","approximately","a","an","the","at","room",
  "temperature","if","as","needed","desired","into","in","cut","with",
]);

// Words that (alone or with filler) mark a comma-segment as droppable prep/notes.
// Generous on purpose — dropping a trailing "..., drained and rinsed" is safe.
const PREP_SEGMENT = new Set([...STRIP_WORDS,
  "softened","melted","beaten","whisked","seeded","deseeded","cored","pitted",
  "halved","quartered","cubed","julienned","torn","trimmed","sifted","crushed",
  "mashed","toasted","cooked","warmed","chilled","cooled","separated","reserved",
  "thawed","defrosted","optional","drizzling","brushing","serving","garnish",
  "dusting","greasing","taste","zested","juiced","stemmed","rinsed","patted","dry",
]);

export const PANTRY_RE = [
  /^(kosher|sea|table|fine|coarse|flaky|flaked)?\s*salt$/,
  /^salt and pepper$/,
  /^(freshly|fresh)?\s*(coarsely|finely)?\s*(ground|cracked)?\s*(black|white)?\s*pepper$/,
  /^(cold|warm|hot|boiling|iced?|lukewarm)?\s*water$/,
  /^(extra[\s-]?virgin\s*)?(olive|vegetable|canola|sunflower|cooking|neutral|light)?\s*oil$/,
  /^cooking spray$/,
  /^ice( cubes)?$/,
];

export const isNoiseLine = (raw) => {
  const t = raw.trim();
  if (!t) return true;
  if (t.endsWith(":")) return true;
  if (/^for\b/i.test(t) && !/\d/.test(t)) return true;
  return false;
};

// Strip parentheticals — including UNCLOSED "(sifted before measuring" and
// stray orphan brackets that the old /\(.*?\)/ pass left behind.
const stripParens = (s) =>
  s
    .replace(/\([^)]*\)/g, " ")   // balanced groups
    .replace(/\([^)]*$/, " ")     // unclosed trailing group
    .replace(/[()]/g, " ")        // any stray bracket
    .replace(/\s+/g, " ")
    .trim();

const stripEdgeWords = (words) => {
  let w = [...words];
  while (w.length > 1 && STRIP_WORDS.has(w[0].toLowerCase())) w.shift();
  while (w.length > 1 && STRIP_WORDS.has(w[w.length - 1].toLowerCase().replace(/[.,]$/, ""))) w.pop();
  return w;
};

// Re-glue "<number> <tight-unit>" -> "<number><unit>" for a tidy qty label.
const tidyQty = (parts) => {
  const out = [];
  for (let i = 0; i < parts.length; i++) {
    if (i > 0 && TIGHT_UNITS.has(parts[i].toLowerCase()) && isNumberish(out[out.length - 1] || "")) {
      out[out.length - 1] += parts[i];
    } else {
      out.push(parts[i]);
    }
  }
  return out.join(" ").replace(/\s+/g, " ").trim();
};

const isPrepOnly = (seg) => {
  const words = seg.split(/\s+/).map((w) => w.toLowerCase().replace(/[.,]$/, "")).filter(Boolean);
  const core = words.filter((w) => !FILLER.has(w));
  if (!core.length) return true;                 // all filler ("to taste")
  return core.every((w) => PREP_SEGMENT.has(w));
};

// Drop comma/semicolon segments that are pure prep — from BOTH ends, so
// "boneless, skinless chicken thighs" keeps the food and "garlic, minced" loses
// the prep. Anything with a real noun is kept and rejoined without the comma.
const dropPrepSegments = (s) => {
  let segs = s.split(/[,;]/).map((x) => x.trim()).filter(Boolean);
  while (segs.length > 1 && isPrepOnly(segs[segs.length - 1])) segs.pop();
  while (segs.length > 1 && isPrepOnly(segs[0])) segs.shift();
  return segs.join(" ");
};

const parseSingle = (str) => {
  let s = stripParens(String(str || ""));
  // Drop trailing serving/instruction clauses ("to taste", "for garnish", "optional").
  s = s.replace(/[,;]?\s*\b(to taste|as needed|as required|to serve|for serving|for garnish|for dusting|for greasing|for drizzling|if needed|optional|plus extra.*|divided)\b.*$/i, "").trim();
  s = dropPrepSegments(s);                                        // drop prep-only comma segments

  // Leading measure phrases: "Zest of 1 lemon", "A handful of basil"
  s = s.replace(/^(a |an )?(pinch|handful|dash|drop|splash|knob|grating|grind|zest|juice|peel|rind)\s+of\s+/i, "");

  s = s.replace(
    new RegExp(`([0-9${FRAC_CHARS}])\\s*[\u2013-]\\s*([0-9${FRAC_CHARS}])`, "g"),
    "$1 to $2",
  );                                                              // ranges 1-2 / ¾-1 -> "x to y"
  s = s.replace(/(\d)([a-zA-Z])/g, "$1 $2");                      // unglue 400g -> 400 g
  s = s.replace(/\s+/g, " ").trim();
  if (!s) return { name: "", qty: "" };

  const tokens = s.split(" ");
  const qtyParts = [];
  let i = 0;
  while (i < tokens.length) {
    const t = tokens[i];
    const low = t.toLowerCase();
    if (isNumberish(t) || isUnit(t)) { qtyParts.push(t); i++; continue; }
    if (QTY_CONNECTORS.has(low) && isNumberish(tokens[i + 1] || "")) { qtyParts.push(t); i++; continue; }
    if ((low === "of" || low === "a" || low === "an") && qtyParts.length) { i++; continue; } // swallow, don't show
    break;
  }

  let nameWords = tokens.slice(i);
  nameWords = stripEdgeWords(nameWords);
  const name = nameWords.join(" ").replace(/\s+/g, " ").trim();
  const qty = tidyQty(qtyParts);
  return { name, qty };
};

// Public single-item parse (kept for back-compat / shouldSkip).
export const parseIngredient = (str) => parseSingle(str);
export const parseIngredientName = (str) => parseSingle(str).name;

const skipName = (name) => {
  const n = (name || "").toLowerCase().trim();
  if (!n) return true;
  if (PANTRY_RE.some((re) => re.test(n))) return true;
  if (/^(to taste|as needed|as required)$/.test(n)) return true;
  return false;
};

// Clean one item from a distributed list ("of cumin" -> "cumin").
const cleanListName = (part) => {
  let words = part.trim().split(/\s+/).filter(Boolean);
  while (words.length > 1 && ["of", "a", "an"].includes(words[0].toLowerCase())) words.shift();
  return stripEdgeWords(words).join(" ").trim();
};

// Expand a raw line into one OR MORE shop items. Handles the "N unit each X and Y"
// form, where a single amount distributes across a comma/and-separated list.
export const expandIngredient = (raw) => {
  if (isNoiseLine(raw)) return [];
  const base = stripParens(String(raw || ""));

  // "1 tsp each cumin and garlic" / "2 tbsp each of paprika, cumin and salt".
  // \beach\b avoids matching inside "peach", "teacher", etc.
  const m = base.match(/^(.*?)\beach\b\s*(?:of\s+)?(.+)$/i);
  if (m) {
    const { qty } = parseSingle(m[1]);                            // qty from the part before "each"
    if (qty) {
      const listed = m[2].split(/\s*(?:,|&|\band\b)\s*/i).map(cleanListName).filter(Boolean);
      if (listed.length >= 2) {
        return listed.filter((n) => !skipName(n)).map((name) => ({ name, qty }));
      }
    }
  }

  const { name, qty } = parseSingle(raw);
  if (skipName(name)) return [];
  return [{ name, qty }];
};

export const shouldSkip = (raw) =>
  isNoiseLine(raw) || skipName(parseIngredientName(raw));
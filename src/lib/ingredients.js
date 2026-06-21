// ── Ingredient parsing ────────────────────────────────────────────────────────
// Turns raw recipe ingredient lines into clean shopping-list names, and decides
// which lines to skip (pantry staples, section headers, bare labels). Lifted out
// of ShopTab so the parsing rules live in one place — and so the next thing that
// shows an item it shouldn't has a single home to fix.

export const UNITS = new Set([
  "cup","cups","c","tbsp","tablespoon","tablespoons","tsp","teaspoon","teaspoons",
  "oz","ounce","ounces","lb","lbs","pound","pounds","g","gram","grams","kg",
  "ml","l","litre","litres","liter","liters","pint","pints","quart","quarts",
  "gallon","gallons","fl","clove","cloves","slice","slices","piece","pieces",
  "sprig","sprigs","bunch","handful","pinch","dash","drop","can","cans","jar",
  "jars","package","pkg","bag","stick","head","stalk","stalks","sheet",
]);

// Pantry staples you almost certainly own — skipped from the shop list.
// Matched as whole forms (with common qualifiers) so "kosher salt",
// "freshly ground black pepper", "extra virgin olive oil" all skip —
// while "bell pepper", "red pepper flakes", "chilli oil", "peppercorns" stay.
export const PANTRY_RE = [
  /^(kosher|sea|table|fine|coarse|flaky|flaked)?\s*salt$/,
  /^salt and pepper$/,
  /^(freshly|fresh)?\s*(coarsely|finely)?\s*(ground|cracked)?\s*(black|white)?\s*pepper$/,
  /^(cold|warm|hot|boiling|iced?|lukewarm)?\s*water$/,
  /^(extra[\s-]?virgin\s*)?(olive|vegetable|canola|sunflower|cooking|neutral|light)?\s*oil$/,
  /^cooking spray$/,
  /^ice( cubes)?$/,
];

// Drop non-ingredient lines: subsection headers and bare labels.
export const isNoiseLine = (raw) => {
  const t = raw.trim();
  if (!t) return true;
  if (t.endsWith(":")) return true;                    // "For the sauce:", "Topping:"
  if (/^for\b/i.test(t) && !/\d/.test(t)) return true; // "For garnish" (label, no qty)
  return false;
};

export const parseIngredientName = (str) => {
  let s = str.replace(/\(.*?\)/g, "").trim();
  s = s.split(/[,;]/)[0].trim();
  s = s.replace(/^[\d\s\/½⅓⅔¼¾⅕⅖⅗⅘⅙⅚⅛⅜⅝⅞]+/, "").trim();
  const words = s.split(/\s+/);
  if (words.length > 1 && UNITS.has(words[0].toLowerCase().replace(/\.$/, ""))) {
    s = words.slice(1).join(" ");
  }
  s = s.replace(
    /^(large|medium|small|extra large|extra-large|big|tiny|fresh|dried|frozen|whole|ground|chopped|minced|sliced|diced|grated|shredded)\s+/i,
    "",
  );
  return s.trim();
};

export const shouldSkip = (raw) => {
  if (isNoiseLine(raw)) return true;
  const name = parseIngredientName(raw).toLowerCase().trim();
  if (!name) return true;
  if (PANTRY_RE.some((re) => re.test(name))) return true;
  if (/^(to taste|as needed|as required)$/.test(name)) return true;
  return false;
};

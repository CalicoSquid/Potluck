// ── Recipe shaping ────────────────────────────────────────────────────────────
// Recipe data arrives with HTML entities ("&amp;", "&#39;"). Decode them once,
// here, so screens render clean text without sprinkling he.decode() everywhere.

import he from "he";

const decodeStr = (s) => (typeof s === "string" ? he.decode(s) : s);

export const decodeRecipe = (r) => {
  if (!r) return r;
  return {
    ...r,
    name: decodeStr(r.name),
    description: decodeStr(r.description),
    category: decodeStr(r.category),
    cuisine: decodeStr(r.cuisine),
    recipeYield: decodeStr(r.recipeYield),
    ingredients: Array.isArray(r.ingredients)
      ? r.ingredients.map(decodeStr)
      : r.ingredients,
    instructions: Array.isArray(r.instructions)
      ? r.instructions.map(decodeStr)
      : r.instructions,
  };
};

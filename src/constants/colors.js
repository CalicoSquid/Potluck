// Potluck — single fixed palette, no theme system.
// Built on Savor's Tangerine/default gradient: orange brand + teal cabinet.
// This is the ONE colour source. No local BRAND objects, no inline hexes.

export const colors = {
  // Orange / brand gradient
  gradientStart: "#FF5722",
  gradientEnd:   "#FF9800",
  primary:       "#FF6D00",
  orange:        "#FF9800",
  gold:          "#FFB300", // gold win-row markers

  // Teal family (cabinet, text, shadows). teal === rgb(20, 40, 41).
  teal:          "#142829",
  tealDark:      "#0d1c1d",
  tealLight:     "#1a3536",

  // Neutrals
  white:         "#FFFFFF",
  offWhite:      "#FFF8F4",
  cardBg:        "#FFFFFF",
  border:        "#f0ebe6",
  textDark:      "#1a1a1a",
  textMid:       "#555555",
  textLight:     "#999999",
  black:         "#000000",
  error:         "#c0392b",
};

// Teal tint helper for the rgba(20,40,41,x) washes used across the cabinet UI.
export const tealAlpha = (a) => `rgba(20,40,41,${a})`;

// Teal cabinet gradient + shadow, derived from the family above.
export const TEAL_GRADIENT = [colors.tealLight, colors.tealDark];
export const TEAL_SHADOW   = colors.teal;
export const PRIMARY_GRADIENT = [colors.gradientStart, colors.gradientEnd];
export const PRIMARY_SHADOW   = colors.gradientStart;

// The void. Shared by the 86 moment on the reel and The Void tab, so banishing
// and reviewing a banishment speak the same visual language.
export const VOID_GRADIENT = [colors.tealLight, colors.black];
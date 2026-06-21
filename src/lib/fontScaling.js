// ── Global font-scaling control (React 19 / RN 0.81 safe) ─────────────────────
// React 19 dropped `defaultProps` on function components, so the old
// `Text.defaultProps.allowFontScaling = false` silently no-ops — which is why
// large device font settings were breaking fixed layouts again.
//
// Instead we patch each component's render once, injecting the scaling prop
// while still letting any individual <Text>/<TextInput> override it. `Text` and
// `TextInput` are forwardRef objects, so they expose a `.render` we can wrap.
// Import this once, before anything renders (top of index.js).

import React from "react";
import { Text, TextInput } from "react-native";

// Default: hard-disable scaling to protect fixed layouts (the slot reel, the
// centerpiece, the header). To instead *cap* scaling — so large-font users get
// slightly bigger text without breakage — set ALLOW_SCALING = true and tune
// MAX_MULTIPLIER (1.2 ≈ one notch up).
const ALLOW_SCALING  = false;
const MAX_MULTIPLIER = 1.2;

const scalingProps = ALLOW_SCALING
  ? { maxFontSizeMultiplier: MAX_MULTIPLIER }
  : { allowFontScaling: false };

const patch = (Component) => {
  if (!Component || typeof Component.render !== "function" || Component.__scalePatched) {
    return;
  }
  const original = Component.render;
  Component.render = function (...args) {
    const el = original.apply(this, args);
    // Spread element props last so an explicit prop on any usage still wins.
    return React.cloneElement(el, { ...scalingProps, ...el.props });
  };
  Component.__scalePatched = true;
};

patch(Text);
patch(TextInput);
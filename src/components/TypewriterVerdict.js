import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet } from "react-native";

import { colors } from "../constants/colors";

// Verdict, typed out as if some unseen hand is transmitting it — quote marks
// frame the utterance, an orange caret leads, then vanishes when it's done.
//
// The full text is always rendered, invisibly, to hold the box open; the typed
// portion is drawn on top of it. Without this the block is one line while the
// verdict is short and two once it wraps mid-type, and since the hero is
// centred, every wrap shunts the reel above it. Reserve the final size up front
// and nothing moves.
export default function TypewriterVerdict({ text, tone = "default" }) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    setCount(0);
    if (!text) return;
    let i = 0;
    const id = setInterval(() => {
      i += 1;
      setCount(i);
      if (i >= text.length) clearInterval(id);
    }, 50);
    return () => clearInterval(id);
  }, [text]);

  const full = text || "";
  const shown = full.slice(0, count);
  const typing = count < full.length;
  const isVoid = tone === "void";
  const toneStyle = isVoid ? styles.voidTone : null;
  // In the void voice the body text is orange, so orange quote marks and caret
  // would vanish into it. Black pulls them back out and reads as the void
  // itself doing the framing.
  const markStyle = isVoid ? styles.voidQuoteMark : styles.quoteMark;
  const caretStyle = isVoid ? styles.voidCaret : styles.caret;

  return (
    <View style={styles.wrap}>
      {/* Spacer: full text, invisible, sets the final height from frame one. */}
      <Text
        style={[styles.revealQuote, toneStyle, styles.spacer]}
        aria-hidden
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      >
        <Text style={markStyle}>“</Text>
        {full}
        <Text style={markStyle}>”</Text>
      </Text>

      <Text style={[styles.revealQuote, toneStyle, styles.typed]}>
        <Text style={markStyle}>“</Text>
        {shown}
        {typing ? <Text style={caretStyle}>|</Text> : null}
        <Text style={markStyle}>”</Text>
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { width: "100%", justifyContent: "center" },
  revealQuote: {
    fontFamily: "RalewayBold",
    fontSize: 19,
    lineHeight: 26,
    color: colors.teal,
    textAlign: "center",
    paddingHorizontal: 4,
  },
  // The wounded voice. Same typing, same quote marks, same caret — only the
  // colour changes, so a banish reads as the universe still talking rather than
  // as a different piece of UI arriving.
  voidTone: { color: colors.primary },
  // Holds the box at its final size without being seen or read aloud.
  spacer: { opacity: 0 },
  // The visible layer, laid over the invisible spacer.
  typed: { ...StyleSheet.absoluteFillObject },
  quoteMark: { fontFamily: "RalewayBold", fontSize: 24, color: colors.orange },
  voidQuoteMark: { fontFamily: "RalewayBold", fontSize: 24, color: colors.black },
  voidCaret: { fontFamily: "RalewayBold", fontSize: 19, color: colors.black },
  caret: { fontFamily: "RalewayBold", fontSize: 19, color: colors.orange },
});
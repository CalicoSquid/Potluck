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
export default function TypewriterVerdict({ text }) {
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

  return (
    <View style={styles.wrap}>
      {/* Spacer: full text, invisible, sets the final height from frame one. */}
      <Text
        style={[styles.revealQuote, styles.spacer]}
        aria-hidden
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      >
        <Text style={styles.quoteMark}>“</Text>
        {full}
        <Text style={styles.quoteMark}>”</Text>
      </Text>

      <Text style={[styles.revealQuote, styles.typed]}>
        <Text style={styles.quoteMark}>“</Text>
        {shown}
        {typing ? <Text style={styles.caret}>|</Text> : null}
        <Text style={styles.quoteMark}>”</Text>
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
  // Holds the box at its final size without being seen or read aloud.
  spacer: { opacity: 0 },
  // The visible layer, laid over the invisible spacer.
  typed: { ...StyleSheet.absoluteFillObject },
  quoteMark: { fontFamily: "RalewayBold", fontSize: 24, color: colors.orange },
  caret: { fontFamily: "RalewayBold", fontSize: 19, color: colors.orange },
});
import React, { useState, useEffect } from "react";
import { Text, StyleSheet } from "react-native";

import { colors } from "../constants/colors";

// Verdict, typed out as if some unseen hand is transmitting it — quote marks
// frame the utterance, an orange caret leads, then vanishes when it's done.
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
    <Text style={styles.revealQuote}>
      <Text style={styles.quoteMark}>“</Text>
      {shown}
      {typing ? <Text style={styles.caret}>|</Text> : null}
      <Text style={styles.quoteMark}>”</Text>
    </Text>
  );
}

const styles = StyleSheet.create({
  revealQuote: {
    fontFamily: "RalewayBold",
    fontSize: 19,
    lineHeight: 26,
    color: colors.teal,
    textAlign: "center",
    paddingHorizontal: 4,
  },
  quoteMark: { fontFamily: "RalewayBold", fontSize: 24, color: colors.orange },
  caret: { fontFamily: "RalewayBold", fontSize: 19, color: colors.orange },
});

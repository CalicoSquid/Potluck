import React from "react";
import { View, Text, StyleSheet } from "react-native";

import { colors } from "../constants/colors";
import { cleanUnit, MAX_SANE_MINS } from "../lib/time";

// Reads the raw h/m block directly rather than going through sumTime, so it
// has to do its own sanitising — cleanUnit strips negatives, NaN and absurd
// values, and the total is dropped entirely if it exceeds two days.
const formatTime = (t) => {
  if (!t) return null;

  const h = cleanUnit(t.hours);
  const m = cleanUnit(t.minutes);
  if (h * 60 + m > MAX_SANE_MINS) return null;

  const parts = [];
  if (h > 0) parts.push(`${h}h`);
  if (m > 0) parts.push(`${m}m`);
  return parts.length ? parts.join(" ") : null;
};

const InlineTimes = ({ times }) => {
  const entries = [
    { label: "Prep",  value: formatTime(times?.prep)  },
    { label: "Cook",  value: formatTime(times?.cook)  },
    { label: "Total", value: formatTime(times?.total) },
  ].filter((e) => e.value);

  if (!entries.length) return null;

  return (
    <View style={styles.row}>
      {entries.map((e, i) => (
        <React.Fragment key={e.label}>
          {i > 0 && <View style={styles.dot} />}
          <Text style={styles.text}>
            <Text style={styles.label}>{e.label} </Text>
            {e.value}
          </Text>
        </React.Fragment>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems:    "center",
    flexWrap:      "wrap",
    gap:           8,
    marginTop:     4,
  },
  dot: {
    width:           3,
    height:          3,
    borderRadius:    2,
    backgroundColor: colors.orange,
    opacity:         0.6,
  },
  label: {
    fontFamily: "RalewayBold",
    fontSize:   12,
    color:      colors.primary,
  },
  text: {
    fontFamily: "Raleway",
    fontSize:   12,
    color:      colors.teal,
    opacity:    0.75,
  },
});

export default InlineTimes;
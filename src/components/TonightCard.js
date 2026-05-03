import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { colors as C } from "../constants/colors";

/**
 * TonightCard — matches Savor's Section card pattern from Settings.
 * White bg, 20px radius, subtle shadow, optional left-accent title.
 *
 * Props: title (optional), children, style
 */
const TonightCard = ({ title, children, style }) => (
  <View style={[styles.card, style]}>
    {title ? (
      <View style={styles.titleRow}>
        <Text style={styles.titleText}>{title}</Text>
      </View>
    ) : null}
    {children}
  </View>
);

const styles = StyleSheet.create({
  card: {
    width:           "100%",
    backgroundColor: "#fff",
    borderRadius:    20,
    padding:         20,
    elevation:       2,
    shadowColor:     "#000",
    shadowOffset:    { width: 0, height: 2 },
    shadowOpacity:   0.06,
    shadowRadius:    8,
  },
  titleRow: {
    borderLeftWidth:  3,
    borderLeftColor:  C.primary,
    paddingLeft:      10,
    marginBottom:     16,
  },
  titleText: {
    fontFamily: "RalewaySemiBold",
    fontSize:   17,
    lineHeight: 18,
    color:      "#1a1a1a",
  },
});

export default TonightCard;
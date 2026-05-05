import React from "react";
import { View, Text, StyleSheet } from "react-native";
import TonightCard from "./TonightCard";

const BRAND = { teal: "#142829", orange: "#FF9800" };

const IngredientList = ({ ingredients, recipeYield }) => (
  <View>
    {recipeYield ? (
      <Text style={styles.yieldText}>Serves {recipeYield}</Text>
    ) : null}
    <TonightCard>
      {(ingredients || []).map((item, i) => (
        <View
          key={i}
          style={[
            styles.row,
            i < ingredients.length - 1 && styles.rowBorder,
          ]}
        >
          <View style={styles.dot} />
          <Text style={styles.text}>{item}</Text>
        </View>
      ))}
    </TonightCard>
  </View>
);

const styles = StyleSheet.create({
  yieldText: {
    fontFamily:   "Raleway",
    fontSize:     13,
    color:        BRAND.teal,
    opacity:      0.55,
    marginBottom: 10,
  },
  row: {
    flexDirection: "row",
    alignItems:    "flex-start",
    gap:           10,
    paddingVertical:   10,
    paddingHorizontal: 16,
  },
  rowBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#f0ebe6",
  },
  dot: {
    width:           5,
    height:          5,
    borderRadius:    3,
    backgroundColor: BRAND.orange,
    opacity:         0.7,
    marginTop:       8,
    flexShrink:      0,
  },
  text: {
    flex:       1,
    fontFamily: "Raleway",
    fontSize:   15,
    color:      BRAND.teal,
    lineHeight: 22,
  },
});

export default IngredientList;
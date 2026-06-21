import React from "react";
import { View, Text, StyleSheet } from "react-native";

import PotluckCard from "./PotluckCard";
import { colors } from "../constants/colors";

const IngredientList = ({ ingredients, recipeYield }) => (
  <View>
    {recipeYield ? (
      <Text style={styles.yieldText}>Serves {recipeYield}</Text>
    ) : null}
    <PotluckCard>
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
    </PotluckCard>
  </View>
);

const styles = StyleSheet.create({
  yieldText: {
    fontFamily:   "Raleway",
    fontSize:     13,
    color:        colors.teal,
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
    borderBottomColor: colors.border,
  },
  dot: {
    width:           5,
    height:          5,
    borderRadius:    3,
    backgroundColor: colors.orange,
    opacity:         0.7,
    marginTop:       8,
    flexShrink:      0,
  },
  text: {
    flex:       1,
    fontFamily: "Raleway",
    fontSize:   15,
    color:      colors.teal,
    lineHeight: 22,
  },
});

export default IngredientList;

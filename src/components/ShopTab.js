import React, { useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Share } from "react-native";
import { Icon } from "react-native-paper";
import TonightCard from "./TonightCard";
import { colors } from "../constants/colors";

const BRAND = {
  teal:   "#142829",
  orange: "#FF9800",
  border: "#f0ebe6",
};

// ── Ingredient parsing ────────────────────────────────────────────────────────

const UNITS = new Set([
  "cup","cups","c","tbsp","tablespoon","tablespoons","tsp","teaspoon","teaspoons",
  "oz","ounce","ounces","lb","lbs","pound","pounds","g","gram","grams","kg",
  "ml","l","litre","litres","liter","liters","pint","pints","quart","quarts",
  "gallon","gallons","fl","clove","cloves","slice","slices","piece","pieces",
  "sprig","sprigs","bunch","handful","pinch","dash","drop","can","cans","jar",
  "jars","package","pkg","bag","stick","head","stalk","stalks","sheet",
]);

const SKIP = new Set([
  "water","salt","pepper","black pepper","white pepper","oil","olive oil",
  "vegetable oil","cooking oil","cooking spray","spray","ice","ice cubes",
  "to taste","as needed","as required",
]);

const parseIngredientName = (str) => {
  let s = str.replace(/\(.*?\)/g, "").trim();
  s = s.split(/[,;]/)[0].trim();
  s = s.replace(/^[\d\s\/½⅓⅔¼¾⅕⅖⅗⅘⅙⅚⅛⅜⅝⅞]+/, "").trim();
  const words = s.split(/\s+/);
  if (words.length > 1 && UNITS.has(words[0].toLowerCase().replace(/\.$/, ""))) {
    s = words.slice(1).join(" ");
  }
  s = s.replace(
    /^(large|medium|small|extra large|extra-large|big|tiny|fresh|dried|frozen|whole|ground|chopped|minced|sliced|diced|grated|shredded)\s+/i,
    "",
  );
  return s.trim();
};

const shouldSkip = (str) => {
  const name = parseIngredientName(str).toLowerCase();
  return SKIP.has(name) || name.length === 0;
};

// ── Component ─────────────────────────────────────────────────────────────────

const ShopTab = ({ ingredients, recipeName, recipeId, recipeYield }) => {
  const shopItems = React.useMemo(
    () =>
      (ingredients || [])
        .map((raw, originalIndex) => ({ raw, name: parseIngredientName(raw), originalIndex }))
        .filter(({ raw }) => !shouldSkip(raw)),
    [ingredients],
  );

  const [checked, setChecked] = useState({});

  const toggle = (i) => setChecked((prev) => ({ ...prev, [i]: !prev[i] }));

  const handleShare = () => {
    const lines  = shopItems.map(({ name }) => `• ${name}`).join("\n");
    const header = recipeYield
      ? `Shopping list for ${recipeName} (serves ${recipeYield}):`
      : `Shopping list for ${recipeName}:`;
    Share.share({ message: `${header}\n\n${lines}` });
  };

  const checkedCount = Object.values(checked).filter(Boolean).length;
  const total        = shopItems.length;

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.sectionLabel}>Shopping list</Text>
          {recipeYield ? (
            <Text style={styles.yieldText}>Serves {recipeYield}</Text>
          ) : null}
        </View>
        <TouchableOpacity style={styles.shareBtn} onPress={handleShare} activeOpacity={0.7}>
          <Icon source="share-variant" size={16} color={colors.primary} />
          <Text style={styles.shareLabel}>Share list</Text>
        </TouchableOpacity>
      </View>

      {checkedCount > 0 && (
        <Text style={styles.progress}>{checkedCount} of {total} grabbed</Text>
      )}

      <TonightCard style={styles.listCard}>
        {shopItems.map(({ name }, i) => (
          <TouchableOpacity
            key={i}
            style={[styles.row, i < shopItems.length - 1 && styles.rowBorder]}
            onPress={() => toggle(i)}
            activeOpacity={0.7}
          >
            <View style={[styles.checkbox, checked[i] && styles.checkboxDone]}>
              {checked[i] && <Icon source="check" size={14} color="#fff" />}
            </View>
            <Text style={[styles.itemText, checked[i] && styles.itemDone]}>
              {name}
            </Text>
          </TouchableOpacity>
        ))}
      </TonightCard>

      {checkedCount === total && total > 0 && (
        <Text style={styles.allDone}>All grabbed — time to cook!</Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: 12,
  },
  headerRow: {
    flexDirection:  "row",
    justifyContent: "space-between",
    alignItems:     "flex-start",
  },
  sectionLabel: {
    fontFamily: "RalewayBold",
    fontSize:   16,
    color:      BRAND.teal,
  },
  yieldText: {
    fontFamily: "Raleway",
    fontSize:   13,
    color:      BRAND.teal,
    opacity:    0.55,
    marginTop:  2,
  },
  shareBtn: {
    flexDirection:   "row",
    alignItems:      "center",
    gap:             5,
    paddingVertical: 2,
    paddingHorizontal: 10,
    borderRadius:    20,
    borderWidth:     1,
    borderColor:     colors.primary + "40",
    backgroundColor: colors.primary + "0D",
  },
  shareLabel: {
    fontFamily: "RalewayBold",
    fontSize:   12,
    color:      colors.primary,
  },
  progress: {
    fontFamily: "Raleway",
    fontSize:   12,
    color:      BRAND.teal,
    opacity:    0.55,
    marginTop:  -4,
  },
  listCard: { padding: 0 },
  row: {
    flexDirection:     "row",
    alignItems:        "center",
    gap:               14,
    paddingVertical:   13,
    paddingHorizontal: 16,
  },
  rowBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: BRAND.border,
  },
  checkbox: {
    width:          22,
    height:         22,
    borderRadius:   6,
    borderWidth:    2,
    borderColor:    BRAND.border,
    flexShrink:     0,
    alignItems:     "center",
    justifyContent: "center",
  },
  checkboxDone: {
    backgroundColor: colors.primary,
    borderColor:     colors.primary,
  },
  itemText: {
    flex:       1,
    fontFamily: "Raleway",
    fontSize:   15,
    color:      BRAND.teal,
    lineHeight: 22,
  },
  itemDone: {
    color:              BRAND.teal,
    opacity:            0.4,
    textDecorationLine: "line-through",
  },
  allDone: {
    fontFamily: "RalewayBold",
    fontSize:   13,
    color:      colors.primary,
    textAlign:  "center",
    marginTop:  4,
  },
});

export default ShopTab;
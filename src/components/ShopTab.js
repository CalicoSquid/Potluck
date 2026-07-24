import React, { useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Share } from "react-native";
import { Icon } from "react-native-paper";

import PotluckCard from "./PotluckCard";
import { colors } from "../constants/colors";
import { expandIngredient } from "../lib/ingredients";

const label = (item, showAmounts) =>
  showAmounts && item.qty ? `${item.qty} ${item.name}` : item.name;

const ShopTab = ({ ingredients, recipeName, recipeId, recipeYield }) => {
  const [showAmounts, setShowAmounts] = useState(false);
  const [checked, setChecked]         = useState({});

  // Parse once; keep a stable `key` (original index) so checkbox state survives
  // the amounts toggle even when the displayed list changes length.
  // One raw line can expand into several rows (e.g. "1 tsp each cumin and garlic").
  const allItems = React.useMemo(
    () =>
      (ingredients || []).flatMap((raw, idx) =>
        expandIngredient(raw).map((it, j) => ({ key: `${idx}:${j}`, ...it })),
      ),
    [ingredients],
  );

  // Displayed list: de-dupe by name when showing bare names; keep every line
  // (with its own amount) when amounts are on.
  const items = React.useMemo(() => {
    if (showAmounts) return allItems;
    const seen = new Set();
    return allItems.filter((it) => {
      const k = it.name.toLowerCase();
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    });
  }, [allItems, showAmounts]);

  const toggle = (key) => setChecked((prev) => ({ ...prev, [key]: !prev[key] }));

  const handleShare = () => {
    const lines  = items.map((it) => `• ${label(it, showAmounts)}`).join("\n");
    const header = recipeYield
      ? `Shopping list for ${recipeName} (serves ${recipeYield}):`
      : `Shopping list for ${recipeName}:`;
    Share.share({ message: `${header}\n\n${lines}` });
  };

  const checkedCount = items.filter((it) => checked[it.key]).length;
  const total        = items.length;

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.sectionLabel}>Shopping list</Text>
          {recipeYield ? (
            <Text style={styles.yieldText}>Serves {recipeYield}</Text>
          ) : null}
        </View>

        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.pill, showAmounts && styles.pillOn]}
            onPress={() => setShowAmounts((v) => !v)}
            activeOpacity={0.7}
          >
            <Icon
              source={showAmounts ? "checkbox-marked" : "checkbox-blank-outline"}
              size={14}
              color={showAmounts ? colors.primary : colors.teal}
            />
            <Text style={[styles.pillLabel, showAmounts && styles.pillLabelOn]}>
              Amounts
            </Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.pill} onPress={handleShare} activeOpacity={0.7}>
            <Icon source="share-variant" size={14} color={colors.primary} />
            <Text style={[styles.pillLabel, styles.pillLabelOn]}>Share</Text>
          </TouchableOpacity>
        </View>
      </View>

      {checkedCount > 0 && (
        <Text style={styles.progress}>{checkedCount} of {total} grabbed</Text>
      )}

      <PotluckCard style={styles.listCard}>
        {items.map((it, i) => (
          <TouchableOpacity
            key={it.key}
            style={[styles.row, i < items.length - 1 && styles.rowBorder]}
            onPress={() => toggle(it.key)}
            activeOpacity={0.7}
          >
            <View style={[styles.checkbox, checked[it.key] && styles.checkboxDone]}>
              {checked[it.key] && <Icon source="check" size={14} color="#fff" />}
            </View>
            <Text style={[styles.itemText, checked[it.key] && styles.itemDone]}>
              {label(it, showAmounts)}
            </Text>
          </TouchableOpacity>
        ))}
      </PotluckCard>

      {checkedCount === total && total > 0 && (
        <Text style={styles.allDone}>All grabbed — time to cook!</Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { gap: 12 },
  headerRow: {
    flexDirection:  "row",
    justifyContent: "space-between",
    alignItems:     "flex-start",
  },
  sectionLabel: {
    fontFamily: "RalewayBold",
    fontSize:   16,
    color:      colors.teal,
  },
  yieldText: {
    fontFamily: "Raleway",
    fontSize:   13,
    color:      colors.teal,
    opacity:    0.55,
    marginTop:  2,
  },
  actions: { flexDirection: "row", alignItems: "center", gap: 8 },
  pill: {
    flexDirection:     "row",
    alignItems:        "center",
    gap:               5,
    paddingVertical:   3,
    paddingHorizontal: 10,
    borderRadius:      20,
    borderWidth:       1,
    borderColor:       colors.border,
    backgroundColor:   "transparent",
  },
  pillOn: {
    borderColor:     colors.primary + "40",
    backgroundColor: colors.primary + "0D",
  },
  pillLabel: {
    fontFamily: "RalewayBold",
    fontSize:   12,
    color:      colors.teal,
    opacity:    0.7,
  },
  pillLabelOn: { color: colors.primary, opacity: 1 },
  progress: {
    fontFamily: "Raleway",
    fontSize:   12,
    color:      colors.teal,
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
    borderBottomColor: colors.border,
  },
  checkbox: {
    width:          22,
    height:         22,
    borderRadius:   6,
    borderWidth:    2,
    borderColor:    colors.border,
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
    color:      colors.teal,
    lineHeight: 22,
  },
  itemDone: {
    color:              colors.teal,
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
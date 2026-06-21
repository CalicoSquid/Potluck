import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { LinearGradient } from "expo-linear-gradient";

import { colors } from "../constants/colors";

// Recipe / Shop tab switcher for RecipeScreen. Gradient underline marks the
// active tab; teal labels dim when inactive.
export default function TabBar({ active, onChange }) {
  return (
    <View style={styles.wrap}>
      {["Recipe", "Shop"].map((tab) => (
        <TouchableOpacity
          key={tab}
          style={styles.tab}
          onPress={() => onChange(tab)}
          activeOpacity={0.7}
        >
          <Text style={[styles.label, active === tab && styles.labelActive]}>
            {tab}
          </Text>
          {active === tab && (
            <LinearGradient
              colors={[colors.gradientStart, colors.gradientEnd]}
              style={styles.indicator}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            />
          )}
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    marginHorizontal: 20,
    marginBottom: 4,
  },
  tab: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 12,
    position: "relative",
  },
  label: {
    fontFamily: "RalewaySemiBold",
    fontSize: 15,
    color: colors.teal,
    opacity: 0.4,
  },
  labelActive: {
    color: colors.teal,
    opacity: 1,
  },
  indicator: {
    position: "absolute",
    bottom: -1,
    left: "20%",
    right: "20%",
    height: 3,
    borderRadius: 2,
  },
});

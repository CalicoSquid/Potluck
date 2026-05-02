import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { colors } from "../constants/colors";

export default function RecipeScreen() {
  return (
    <LinearGradient colors={[colors.gradientStart, colors.gradientEnd]} style={styles.fill}>
      <View style={styles.centre}>
        <Text style={styles.text}>RecipeScreen — coming soon</Text>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  fill:   { flex: 1 },
  centre: { flex: 1, alignItems: "center", justifyContent: "center" },
  text:   { fontFamily: "RalewayBold", fontSize: 18, color: colors.white },
});
import React from "react";
import { View, StyleSheet, Image, TouchableOpacity } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";
import { Icon } from "react-native-paper";
import { colors } from "../constants/colors";

/**
 * PotluckHeader — shared header for all Potluck screens.
 *
 * Design:
 *   - White background, matches Savor card pattern
 *   - 3px orange gradient strip along the bottom edge as a brand thread
 *   - Left:  Savor logo (home) OR back button (other screens)
 *   - Right: three pip dots showing session spin progress
 *
 * Pips cycle through brand colours — orange, green, teal.
 * Filled pip = spin used. Hollow pip = spin remaining (ring in same colour).
 *
 * Props:
 *   onBack    — optional. If provided, shows back chevron instead of logo
 *   spinCount — number of spins used (0–3). Drives pip fill state.
 */

const PIP_COLORS = ["#FF9800", "#4caf50", "#26a69a"];
const MAX_PIPS   = 3;

const Pip = ({ filled, color }) => (
  <View
    style={[
      styles.pip,
      filled
        ? { backgroundColor: color, borderColor: color }
        : { backgroundColor: "transparent", borderColor: color, opacity: 0.55 },
    ]}
  />
);

const PotluckHeader = ({ onBack, spinCount = 0, onLayout }) => {
  return (
    <View style={styles.wrap} onLayout={onLayout}>
      <SafeAreaView edges={["top"]} style={styles.safeArea}>
        <View style={styles.row}>
          {/* ── Left: back button OR savor logo ── */}
          <View style={styles.leftSlot}>
            {onBack ? (
              <TouchableOpacity
                onPress={onBack}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                style={styles.backBtn}
                activeOpacity={0.6}
              >
                <Icon source="chevron-left" size={28} color="#142829" />
              </TouchableOpacity>
            ) : (
              <Image
                source={require("../../assets/savor-logo.png")}
                style={styles.logo}
                resizeMode="contain"
              />
            )}
          </View>

          {/* ── Right: spin progress pips ── */}
          <View style={styles.rightSlot}>
            {Array.from({ length: MAX_PIPS }).map((_, i) => (
              <Pip
                key={i}
                color={PIP_COLORS[i]}
                filled={i < spinCount}
              />
            ))}
          </View>
        </View>
      </SafeAreaView>

      {/* ── Bottom edge: 3px orange gradient thread ── */}
      <LinearGradient
        colors={[colors.gradientStart, colors.gradientEnd]}
        style={styles.thread}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: "#ffffff",
  },
  safeArea: {
    backgroundColor: "#ffffff",
  },
  row: {
    height:            48,
    flexDirection:     "row",
    alignItems:        "center",
    justifyContent:    "space-between",
    paddingHorizontal: 16,
  },

  leftSlot: {
    minWidth:   32,
    minHeight:  32,
    alignItems: "flex-start",
    justifyContent: "center",
  },
  backBtn: {
    width:          32,
    height:         32,
    marginLeft:     -6,    // chevron has padding, pull it back to align with 16px edge
    alignItems:     "center",
    justifyContent: "center",
  },
  logo: {
    width:  30,
    height: 30,
  },

  rightSlot: {
    flexDirection: "row",
    alignItems:    "center",
    gap:           7,
  },
  pip: {
    width:        9,
    height:       9,
    borderRadius: 4.5,
    borderWidth:  1.5,
  },

  thread: {
    height: 3,
    width:  "100%",
  },
});

export default PotluckHeader;
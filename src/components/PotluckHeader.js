import React, { useState, useRef, useEffect } from "react";
import { View, StyleSheet, Image, TouchableOpacity, Animated } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";
import { Icon } from "react-native-paper";
import { colors } from "../constants/colors";
import AboutSheet from "./AboutSheet";

/**
 * PotluckHeader — shared header for all Potluck screens.
 *   - Left:  Savor logo (home) OR back chevron (other screens)
 *   - Right: the three-dot brand signature. Solid at rest; pulses left→right
 *            while a spin is in flight; taps open the About sheet.
 *   - Bottom: 3px orange gradient thread.
 *
 * Props:
 *   onBack    — optional. If provided, shows back chevron instead of logo.
 *   spinning  — optional. When true, the signature dots pulse in sequence.
 *   onLayout  — optional. Reports header height (for ComicBackground).
 */

const DOT_COLORS = ["#FF9800", "#4caf50", "#26a69a"];

const Signature = ({ spinning, onPress }) => {
  const dots = useRef(DOT_COLORS.map(() => new Animated.Value(0))).current;
  const loopRef = useRef(null);

  useEffect(() => {
    if (spinning) {
      const pulse = (v) =>
        Animated.sequence([
          Animated.timing(v, { toValue: 1, duration: 160, useNativeDriver: true }),
          Animated.timing(v, { toValue: 0, duration: 260, useNativeDriver: true }),
        ]);
      loopRef.current = Animated.loop(Animated.stagger(130, dots.map(pulse)));
      loopRef.current.start();
    } else {
      loopRef.current?.stop();
      dots.forEach((v) =>
        Animated.timing(v, { toValue: 0, duration: 180, useNativeDriver: true }).start()
      );
    }
    return () => loopRef.current?.stop();
  }, [spinning]);

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.6}
      hitSlop={{ top: 14, bottom: 14, left: 14, right: 14 }}
      style={styles.signature}
    >
      {dots.map((v, i) => (
        <Animated.View
          key={i}
          style={[
            styles.dot,
            {
              backgroundColor: DOT_COLORS[i],
              opacity: v.interpolate({ inputRange: [0, 1], outputRange: [0.9, 1] }),
              transform: [{ scale: v.interpolate({ inputRange: [0, 1], outputRange: [1, 1.5] }) }],
            },
          ]}
        />
      ))}
    </TouchableOpacity>
  );
};

const PotluckHeader = ({ onBack, spinning = false, onLayout }) => {
  const [aboutVisible, setAboutVisible] = useState(false);

  return (
    <View style={styles.wrap} onLayout={onLayout}>
      <SafeAreaView edges={["top"]} style={styles.safeArea}>
        <View style={styles.row}>
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
                source={require("../../assets/potluck-splash.png")}
                style={styles.logo}
                resizeMode="contain"
              />
            )}
          </View>

          <Signature spinning={spinning} onPress={() => setAboutVisible(true)} />
        </View>
      </SafeAreaView>

      <LinearGradient
        colors={[colors.gradientStart, colors.gradientEnd]}
        style={styles.thread}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
      />

      <AboutSheet visible={aboutVisible} onClose={() => setAboutVisible(false)} />
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: { backgroundColor: "#ffffff" },
  safeArea: { backgroundColor: "#ffffff" },
  row: {
    height: 48,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
  },
  leftSlot: { minWidth: 32, minHeight: 32, alignItems: "flex-start", justifyContent: "center" },
  backBtn: { width: 32, height: 32, marginLeft: -6, alignItems: "center", justifyContent: "center" },
  logo: { width: 30, height: 30 },

  signature: { flexDirection: "row", alignItems: "center", gap: 7, paddingVertical: 6, paddingLeft: 6 },
  dot: { width: 8, height: 8, borderRadius: 4 },

  thread: { height: 3, width: "100%" },
});

export default PotluckHeader;
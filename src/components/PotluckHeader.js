import React, { useState, useRef, useEffect } from "react";
import {
  View,
  StyleSheet,
  Image,
  TouchableOpacity,
  Animated,
  Easing,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";
import { Icon } from "react-native-paper";
import { colors } from "../constants/colors";
import AboutSheet from "./AboutSheet";

/**
 * PotluckHeader — shared header for all Potluck screens.
 *   - Left:  the wheel brand-mark (home) OR back chevron (other screens). On
 *            the home screen the wheel's rainbow spins on every spin.
 *   - Right: the three-dot brand signature. Solid at rest; gives one calm
 *            pulse when a fresh reading is waiting; taps open the About sheet.
 *   - Bottom: 3px orange gradient thread.
 *
 * Props:
 *   onBack     — optional. If provided, shows back chevron instead of the wheel.
 *   spinning   — optional. When true, the home wheel spins.
 *   hasReading — optional. When true, the signature pulses once on open.
 *   onLayout   — optional. Reports header height (for ComicBackground).
 *   onVoidChange — optional. Receives the current banned ID list after a restore.
 *   voidPending  — optional. When true, the signature wears the void colourway
 *                  and taps land on the Void tab rather than This Week.
 *   onVoidSeen   — optional. Fired on open; clears the pending flag.
 *   attention    — optional. When true, the signature breathes on a loop in the
 *                  normal colourway — used on Done to point at the menu the
 *                  dish was just filed into.
 */

const DOT_COLORS = [colors.orange, "#4caf50", "#26a69a"];
// The void colourway — dark, with a single ember still burning in the middle.
// Same pairing as the 86 stamp on the reel, so it reads as "something's in
// there" rather than "something's wrong".
const VOID_DOT_COLORS = [colors.tealDark, colors.orange, colors.teal];

const WHEEL_SIZE = 38;

// The header brand-mark, layered like the Centerpiece so only the rainbow
// turns inside the static ring + leaves. Spins and decelerates on each spin —
// the logo finally doing what it's shaped to do, in sync with the reel.
const HeaderWheel = ({ spinning }) => {
  const rot = useRef(new Animated.Value(0)).current;
  const turns = useRef(0);

  useEffect(() => {
    if (!spinning) return;
    turns.current += 4;
    Animated.timing(rot, {
      toValue: turns.current,
      duration: 1700,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [spinning]);

  const spin = rot.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "360deg"],
  });
  const SP = WHEEL_SIZE * 0.72;

  return (
    <View
      style={{
        width: WHEEL_SIZE,
        height: WHEEL_SIZE,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Animated.Image
        source={require("../../assets/spinner.png")}
        resizeMode="contain"
        style={{
          position: "absolute",
          width: SP,
          height: SP,
          top: (WHEEL_SIZE - SP) / 1.4,
          left: (WHEEL_SIZE - SP) / 2,
          transform: [{ rotate: spin }],
        }}
      />
      <Image
        source={require("../../assets/outer.png")}
        resizeMode="contain"
        style={{ width: WHEEL_SIZE, height: WHEEL_SIZE }}
      />
    </View>
  );
};

const Signature = ({
  spinning,
  hasReading = false,
  voidPending = false,
  attention = false,
  onPress,
}) => {
  const dots = useRef(DOT_COLORS.map(() => new Animated.Value(0))).current;
  const greetedRef = useRef(false);
  const palette = voidPending ? VOID_DOT_COLORS : DOT_COLORS;

  // A slow breath on the middle pip. Two callers, one animation — the void
  // uses it to say "something's in there", Done uses it to say "tonight's dish
  // is filed in here". Deliberately not two similar animations: it's the same
  // loop, the same dot, the same curve, and only the palette differs. Loops
  // until acknowledged — unlike the reading pulse, which fires once.
  const breathing = voidPending || attention;
  const ember = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!breathing) {
      ember.setValue(0);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(ember, {
          toValue: 1,
          duration: 900,
          useNativeDriver: true,
        }),
        Animated.timing(ember, {
          toValue: 0,
          duration: 1100,
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [breathing]);

  // One calm pulse on open when today already has a reading waiting — a
  // heartbeat, not a notification. Fires once per mount (i.e. per app open).
  // (The spin-activity signal now lives in the wheel, so the pips stay still
  // during a spin.)
  useEffect(() => {
    if (!hasReading || greetedRef.current || spinning) return;
    greetedRef.current = true;
    const pulse = (v) =>
      Animated.sequence([
        Animated.timing(v, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(v, {
          toValue: 0,
          duration: 340,
          useNativeDriver: true,
        }),
      ]);
    Animated.stagger(120, dots.map(pulse)).start();
  }, [hasReading, spinning]);

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.6}
      hitSlop={{ top: 14, bottom: 14, left: 14, right: 14 }}
      style={[styles.signature, voidPending && styles.signatureVoid]}
      accessibilityLabel={
        voidPending
          ? "Menu — something new in the Void"
          : attention
            ? "Menu — tonight's dish is saved in This Week"
            : "Menu — your week and the Void"
      }
      accessibilityRole="button"
    >
      {dots.map((v, i) => (
        <Animated.View
          key={i}
          style={[
            styles.dot,
            {
              backgroundColor: palette[i],
              opacity: v.interpolate({
                inputRange: [0, 1],
                outputRange: [0.9, 1],
              }),
              transform: [
                {
                  scale: Animated.multiply(
                    v.interpolate({
                      inputRange: [0, 1],
                      outputRange: [1, 1.5],
                    }),
                    breathing && i === 1
                      ? ember.interpolate({
                          inputRange: [0, 1],
                          outputRange: [1, 1.35],
                        })
                      : 1,
                  ),
                },
              ],
            },
          ]}
        />
      ))}
    </TouchableOpacity>
  );
};

const PotluckHeader = ({
  onBack,
  spinning,
  hasReading,
  onLayout,
  onVoidChange,
  voidPending = false,
  onVoidSeen,
  attention = false,
}) => {
  const [aboutVisible, setAboutVisible] = useState(false);
  // Which tab the *next* open should land on. Set at press time because
  // onVoidSeen() flips voidPending false immediately.
  const [openTab, setOpenTab] = useState(undefined);

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
                <Icon source="chevron-left" size={28} color={colors.teal} />
              </TouchableOpacity>
            ) : (
              <HeaderWheel spinning={spinning} />
            )}
          </View>

           <Signature
            spinning={spinning}
            hasReading={hasReading}
            voidPending={voidPending}
            attention={attention}
            onPress={() => {
              // Capture the intent *before* clearing the flag. When the dots
              // are wearing the void colourway, the tap means "show me what's
              // in there" — landing on This Week (the sheet's default whenever
              // any reading exists) answered a question nobody asked.
              setOpenTab(voidPending ? "void" : undefined);
              setAboutVisible(true);
              onVoidSeen?.();   // seen is seen — the flag dies on open, not on close
            }}
          />
        </View>
      </SafeAreaView>

      <LinearGradient
        colors={[colors.gradientStart, colors.gradientEnd]}
        style={styles.thread}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
      />

      <AboutSheet
        visible={aboutVisible}
        onClose={() => setAboutVisible(false)}
        onVoidChange={onVoidChange}
        initialTab={openTab}
      />
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
  leftSlot: {
    minWidth: 40,
    minHeight: 38,
    alignItems: "flex-start",
    justifyContent: "center",
  },
  backBtn: {
    width: 32,
    height: 32,
    marginLeft: -6,
    alignItems: "center",
    justifyContent: "center",
  },

  signature: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    paddingVertical: 9,
    paddingHorizontal: 13,
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.offWhite,
  },
  dot: { width: 8, height: 8, borderRadius: 4 },

  thread: { height: 3, width: "100%" },
  signatureVoid: {
    borderColor: colors.orange + "66",
    backgroundColor: colors.tealDark + "0d",
  },
});

export default PotluckHeader;
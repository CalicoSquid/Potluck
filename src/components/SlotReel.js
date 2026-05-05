import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  Animated,
  Easing,
} from "react-native";
import * as Haptics from "expo-haptics";

const BRAND = {
  teal:   "#142829",
  orange: "#FF9800",
  green:  "#4caf50",
};

const NOTCH_COLORS      = [BRAND.orange, BRAND.green, BRAND.teal];
const SPIN_SYMBOLS      = ["🍳","🥗","🍝","🍕","🍔","🍜","🥘","🍱","🌮","🥐","🍣","🍲","🥩","🍰","🦞","🌯","🍛","🫕"];
const SPIN_INTERVAL_START = 55;
const SPIN_INTERVAL_END   = 190;
const SPIN_DURATION       = 1800;
const REEL_HOLD_MS        = 500;

// These must match SpinScreen constants exactly
const REEL_HEIGHT = 84;

const SlotReel = ({ recipe, isSpinning, isActiveReel, index, onPress, onLocked, reelWidth }) => {
  const lockAnim  = useRef(new Animated.Value(1)).current;
  const glowAnim  = useRef(new Animated.Value(0)).current;
  const nameFade  = useRef(new Animated.Value(recipe ? 1 : 0)).current;
  const lockedRef = useRef(!!recipe);

  const [spinSymbol, setSpinSymbol] = useState(null);

  // ── Spin ticker ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!isSpinning || lockedRef.current) return;

    let step = 0;
    const totalSteps = Math.round(SPIN_DURATION / SPIN_INTERVAL_START);
    const tickRef    = { current: null };

    const tick = () => {
      step++;
      setSpinSymbol((prev) => {
        let next;
        do {
          next = SPIN_SYMBOLS[Math.floor(Math.random() * SPIN_SYMBOLS.length)];
        } while (next === prev && SPIN_SYMBOLS.length > 1);
        return next;
      });

      if (isActiveReel && step % 3 === 0) {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
      }

      const progress = Math.min(step / totalSteps, 1);
      const delay = SPIN_INTERVAL_START + (SPIN_INTERVAL_END - SPIN_INTERVAL_START) * progress;
      tickRef.current = setTimeout(tick, delay);
    };

    tickRef.current = setTimeout(tick, SPIN_INTERVAL_START);
    return () => clearTimeout(tickRef.current);
  }, [isSpinning]);

  // ── Lock animation ───────────────────────────────────────────────────────────
  useEffect(() => {
    if (!recipe) {
      lockedRef.current = false;
      lockAnim.setValue(1);
      glowAnim.setValue(0);
      nameFade.setValue(0);
      setSpinSymbol(null);
      return;
    }
    if (lockedRef.current) return;
    lockedRef.current = true;
    setSpinSymbol(null);

    lockAnim.setValue(0.84);
    Animated.spring(lockAnim, {
      toValue: 1, friction: 3.5, tension: 340, useNativeDriver: true,
    }).start();

    Animated.sequence([
      Animated.timing(glowAnim, { toValue: 1, duration: 60, useNativeDriver: true }),
      Animated.timing(glowAnim, {
        toValue: 0, duration: 420,
        easing: Easing.out(Easing.quad), useNativeDriver: true,
      }),
    ]).start();

    Animated.timing(nameFade, {
      toValue: 1, duration: 280, delay: 200,
      easing: Easing.out(Easing.quad), useNativeDriver: true,
    }).start();

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    setTimeout(() => onLocked?.(), REEL_HOLD_MS);
  }, [recipe?.id]);

  // ── Render ───────────────────────────────────────────────────────────────────
  const isFilled         = !!recipe;
  const isShowingActive  = isSpinning && !lockedRef.current;
  const notchColor       = NOTCH_COLORS[index];
  const frameStyle       = [styles.frame, { width: reelWidth }, isFilled && styles.frameFilled];

  const windowContent = (() => {
    if (isFilled) {
      return (
        <Animated.View style={[styles.logoWrap, { transform: [{ scale: lockAnim }] }]}>
          <Animated.View
            pointerEvents="none"
            style={[
              StyleSheet.absoluteFill,
              {
                backgroundColor: BRAND.orange,
                borderRadius: 10,
                opacity: glowAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 0.22] }),
              },
            ]}
          />
          <Image
            source={require("../../assets/savor-logo.png")}
            style={styles.lockedLogo}
            resizeMode="contain"
          />
        </Animated.View>
      );
    }
    if (isShowingActive && spinSymbol) {
      return (
        <View style={styles.spinWindow}>
          <Text style={styles.spinEmoji}>{spinSymbol}</Text>
        </View>
      );
    }
    return (
      <View style={styles.idleWindow}>
        <Text style={styles.idleQ}>?</Text>
      </View>
    );
  })();

  if (!isFilled) {
    return (
      <View style={[styles.column, { width: reelWidth }]}>
        <View style={frameStyle}>
          <View style={[styles.notch, { backgroundColor: notchColor }]} />
          <View style={styles.window}>{windowContent}</View>
        </View>
        <View style={styles.namePlaceholder} />
      </View>
    );
  }

  return (
    <View style={[styles.column, { width: reelWidth }]}>
      <TouchableOpacity onPress={onPress} activeOpacity={0.8} style={frameStyle}>
        <View style={[styles.notch, { backgroundColor: notchColor }]} />
        <View style={styles.window}>{windowContent}</View>
      </TouchableOpacity>
      <Animated.Text style={[styles.nameStrip, { opacity: nameFade }]} numberOfLines={2}>
        {recipe.name}
      </Animated.Text>
    </View>
  );
};

const styles = StyleSheet.create({
  column: {
    alignItems: "center",
  },
  frame: {
    height:          REEL_HEIGHT,
    borderRadius:    16,
    backgroundColor: "#ffffff",
    borderWidth:     1,
    borderColor:     "#f0ebe6",
    padding:         3,
    elevation:       2,
    shadowColor:     "#1a1a1a",
    shadowOffset:    { width: 0, height: 2 },
    shadowOpacity:   0.08,
    shadowRadius:    6,
    position:        "relative",
  },
  frameFilled: {
    elevation:     5,
    shadowColor:   "#142829",
    shadowOpacity: 0.16,
    shadowRadius:  10,
    shadowOffset:  { width: 0, height: 4 },
  },
  notch: {
    position:              "absolute",
    left:                  0,
    top:                   12,
    bottom:                12,
    width:                 3,
    borderTopRightRadius:  2,
    borderBottomRightRadius: 2,
    zIndex:                2,
  },
  window: {
    flex:            1,
    borderRadius:    13,
    overflow:        "hidden",
    backgroundColor: "#ffffff",
  },
  idleWindow: {
    flex:            1,
    alignItems:      "center",
    justifyContent:  "center",
    backgroundColor: "#ffffff",
  },
  idleQ: {
    fontFamily: "RalewayBold",
    fontSize:   30,
    color:      "#142829",
    opacity:    0.35,
  },
  spinWindow: {
    flex:           1,
    alignItems:     "center",
    justifyContent: "center",
    backgroundColor: "#ffffff",
  },
  spinEmoji: {
    fontSize:   32,
    lineHeight: 38,
  },
  logoWrap: {
    flex:            1,
    alignItems:      "center",
    justifyContent:  "center",
    backgroundColor: "#ffffff",
    borderRadius:    13,
    overflow:        "hidden",
  },
  lockedLogo: {
    width:  REEL_HEIGHT * 0.62,
    height: REEL_HEIGHT * 0.62,
  },
  nameStrip: {
    fontFamily:    "RalewayBold",
    fontSize:      10,
    color:         "#142829",
    marginTop:     6,
    textAlign:     "center",
    letterSpacing: 0.1,
    lineHeight:    13,
    width:         "100%",
    minHeight:     26,
  },
  namePlaceholder: {
    height: 32,
  },
});

export default SlotReel;
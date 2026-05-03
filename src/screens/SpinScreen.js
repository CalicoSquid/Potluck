import React, { useState, useRef, useCallback } from "react";
import {
  View,
  StyleSheet,
  Animated,
  Easing,
  StatusBar,
  Text,
  Image,
  Dimensions,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLazyQuery } from "@apollo/client/react";
import { gql } from "@apollo/client";
import * as Haptics from "expo-haptics";

import { colors } from "../constants/colors";
import TonightButton from "../components/TonightButton";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

// Wordmark — constrain to screen width minus padding
const WORDMARK_WIDTH  = SCREEN_WIDTH - 48;
const WORDMARK_ASPECT = 500 / 157;
const WORDMARK_HEIGHT = WORDMARK_WIDTH / WORDMARK_ASPECT;

// Spinner wheel
const LOGO_SIZE    = SCREEN_WIDTH * 0.56;
const SPINNER_SIZE = LOGO_SIZE * 0.72;

const MAX_SPINS = 3;

const RANDOM_RECIPE = gql`
  query RandomRecipe($excludeIds: [ID]) {
    randomRecipe(excludeIds: $excludeIds) {
      id
      name
      description
      image
      ingredients
      instructions
      recipeYield
      category
      cuisine
      times {
        cook { hours minutes }
        prep { hours minutes }
        total { hours minutes }
      }
    }
  }
`;

export default function SpinScreen({ navigation }) {
  const [spinCount, setSpinCount] = useState(0);
  const [seenIds,   setSeenIds]   = useState([]);
  const [phase,     setPhase]     = useState("idle");

  const scaleAnim       = useRef(new Animated.Value(1)).current;
  const spinAnim        = useRef(new Animated.Value(0)).current;
  const currentRotation = useRef(0);

  const [fetchRecipe, { loading }] = useLazyQuery(RANDOM_RECIPE, {
    fetchPolicy: "no-cache",
  });

  const handleSpin = useCallback(() => {
    if (phase === "locked" || loading) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setPhase("spinning");

    // Button bounce
    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 0.94, duration: 100,
        easing: Easing.out(Easing.quad), useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1, duration: 220,
        easing: Easing.out(Easing.back(2)), useNativeDriver: true,
      }),
    ]).start();

    // Add 2–3 full rotations on top of current position for variety
    const extraSpins = 2 + Math.random();
    const targetDeg  = currentRotation.current + extraSpins * 360;
    currentRotation.current = targetDeg;

    Animated.timing(spinAnim, {
      toValue:  targetDeg,
      duration: 1100,
      easing:   Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();

    fetchRecipe({ variables: { excludeIds: seenIds } }).then(({ data, error }) => {
      if (error) {
        console.log("❌ error:", JSON.stringify(error));
        setPhase(spinCount > 0 ? "revealed" : "idle");
        return;
      }
      const recipe = data?.randomRecipe;
      if (!recipe) return;

      const nextCount = spinCount + 1;
      const nextSeen  = [...seenIds, recipe.id];
      const locked    = nextCount >= MAX_SPINS;

      setSeenIds(nextSeen);
      setSpinCount(nextCount);
      setPhase(locked ? "locked" : "revealed");

      navigation.navigate("Recipe", {
        recipe,
        spinCount: nextCount,
        seenIds:   nextSeen,
        isLast:    locked,
      });
    }).catch((err) => {
      console.log("❌ catch:", JSON.stringify(err));
      setPhase(spinCount > 0 ? "revealed" : "idle");
    });
  }, [phase, loading, seenIds, spinCount]);

  const spinRotate = spinAnim.interpolate({
    inputRange:  [0, 360],
    outputRange: ["0deg", "360deg"],
  });

  const isLocked  = phase === "locked";
  const spinsLeft = MAX_SPINS - spinCount;
  const hasSpun   = spinCount > 0;

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      {/* ── Gradient header band — decorative only, no text ── */}
      <LinearGradient
        colors={[colors.gradientStart, colors.gradientEnd]}
        style={styles.headerBand}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <SafeAreaView edges={["top"]} />
      </LinearGradient>

      {/* ── White body ── */}
      <View style={styles.body}>

        {/* Wordmark PNG — Savor home screen pattern */}
        <Image
          source={require("../../assets/wordmark-potluck.png")}
          style={[styles.wordmark, { width: WORDMARK_WIDTH, height: WORDMARK_HEIGHT }]}
          resizeMode="contain"
        />

        {/* ── Prize wheel ── */}
        <View style={[styles.logoWrap, { width: LOGO_SIZE, height: LOGO_SIZE }]}>
          {/* Spinner — rotates */}
          <Animated.Image
            source={require("../../assets/spinner.png")}
            style={[
              styles.spinnerImg,
              {
                width:  SPINNER_SIZE,
                height: SPINNER_SIZE,
                // Responsive centre — no more hardcoded top: 45
                top:  (LOGO_SIZE - SPINNER_SIZE) / 2,
                left: (LOGO_SIZE - SPINNER_SIZE) / 2,
                transform: [{ rotate: spinRotate }],
              },
            ]}
            resizeMode="contain"
          />
          {/* Outer frame — static, on top */}
          <Image
            source={require("../../assets/outer.png")}
            style={[styles.outerImg, { width: LOGO_SIZE, height: LOGO_SIZE }]}
            resizeMode="contain"
          />
        </View>

        {/* ── Floating messaging — no card ── */}
        <View style={styles.messaging}>
          <Text style={styles.headline}>
            {isLocked
              ? "That's your three."
              : hasSpun
                ? "Not feeling it?"
                : "What's for dinner?"}
          </Text>
          <Text style={styles.subline}>
            {isLocked
              ? "Pick one and get cooking."
              : hasSpun
                ? `${spinsLeft} spin${spinsLeft === 1 ? "" : "s"} left — make it count.`
                : "No scrolling. No deciding. Just cook."}
          </Text>

          {!isLocked && (
            <View style={styles.dots}>
              {Array.from({ length: MAX_SPINS }).map((_, i) => (
                <View key={i} style={[styles.dot, i < spinCount && styles.dotUsed]} />
              ))}
            </View>
          )}
        </View>

        <View style={styles.spacer} />

        {/* ── CTA ── */}
        {isLocked ? (
          <View style={styles.ctaWrap}>
            <TonightButton
              icon="food-apple"
              title="Get Savor — it's free"
              subtitle="Your full recipe box, unlocked"
              onPress={() => navigation.navigate("Done")}
            />
          </View>
        ) : (
          <Animated.View style={[styles.ctaWrap, { transform: [{ scale: scaleAnim }] }]}>
            <TonightButton
              icon="dice-multiple"
              title={hasSpun ? "Spin again" : "Spin"}
              subtitle={
                loading
                  ? "Finding a recipe…"
                  : hasSpun
                    ? "Get another random recipe"
                    : "Get a random community recipe"
              }
              onPress={handleSpin}
              loading={loading}
            />
          </Animated.View>
        )}

        <Text style={styles.footer}>Recipes by the Savor community</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex:            1,
    backgroundColor: colors.offWhite,
  },

  // Gradient band — SafeAreaView handles status bar padding
  headerBand: { paddingBottom: 12 },

  // White body
  body: {
    flex:              1,
    alignItems:        "center",
    paddingHorizontal: 20,
    paddingTop:        20,
    paddingBottom:     20,
  },

  // Wordmark
  wordmark: {
    marginBottom: 20,
  },

  // Layered wheel
  logoWrap: {
    marginBottom: 24,
    position:     "relative",
  },
  spinnerImg: {
    position: "absolute",
  },
  outerImg: {
    position: "absolute",
    top:  0,
    left: 0,
  },

  // Floating text — no card wrapper
  messaging: {
    alignItems:        "center",
    gap:               10,
    paddingHorizontal: 8,
  },
  headline: {
    fontFamily: "RalewayBold",
    fontSize:   26,
    color:      colors.textDark,
    textAlign:  "center",
    lineHeight: 32,
  },
  subline: {
    fontFamily: "Raleway",
    fontSize:   14,
    color:      colors.textMid,
    textAlign:  "center",
    lineHeight: 21,
  },
  dots: {
    flexDirection: "row",
    gap:           10,
    marginTop:     6,
  },
  dot: {
    width:           9,
    height:          9,
    borderRadius:    5,
    backgroundColor: "#e8e0d8",
  },
  dotUsed: {
    backgroundColor: colors.primary,
  },

  spacer:  { flex: 1 },
  ctaWrap: { width: "100%" },

  footer: {
    fontFamily:    "Raleway",
    fontSize:      12,
    color:         colors.textLight,
    marginTop:     12,
    letterSpacing: 0.3,
  },
});
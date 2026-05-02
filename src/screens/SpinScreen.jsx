import React, { useState, useRef, useCallback } from "react";
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Easing,
  StatusBar,
  Text,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLazyQuery, gql } from "@apollo/client";
import * as Haptics from "expo-haptics";

import { colors } from "../constants/colors";

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
      user { username }
    }
  }
`;

export default function SpinScreen({ navigation }) {
  const [spinCount, setSpinCount] = useState(0);
  const [seenIds, setSeenIds] = useState([]);
  const [phase, setPhase] = useState("idle"); // idle | spinning | revealed | locked

  // Animation values
  const scaleAnim   = useRef(new Animated.Value(1)).current;
  const opacityAnim = useRef(new Animated.Value(1)).current;
  const spinAnim    = useRef(new Animated.Value(0)).current;

  const [fetchRecipe, { loading }] = useLazyQuery(RANDOM_RECIPE, {
    fetchPolicy: "no-cache",
    onCompleted: (data) => {
      const recipe = data?.randomRecipe;
      if (!recipe) return;

      // 1.2s reveal: fade in the result
      Animated.sequence([
        Animated.timing(opacityAnim, {
          toValue: 0, duration: 200, useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1, duration: 400, useNativeDriver: true,
        }),
      ]).start();

      setSeenIds((prev) => [...prev, recipe.id]);
      setSpinCount((prev) => prev + 1);
      setPhase(spinCount + 1 >= MAX_SPINS ? "locked" : "revealed");

      navigation.navigate("Recipe", {
        recipe,
        spinCount: spinCount + 1,
        seenIds:   [...seenIds, recipe.id],
        isLast:    spinCount + 1 >= MAX_SPINS,
      });
    },
    onError: () => {
      setPhase("idle");
    },
  });

  const handleSpin = useCallback(() => {
    if (phase === "locked" || loading) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setPhase("spinning");

    // Button press pulse
    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 0.93, duration: 120, easing: Easing.out(Easing.quad), useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1, duration: 200, easing: Easing.out(Easing.back(2)), useNativeDriver: true,
      }),
    ]).start();

    // Spin the icon
    spinAnim.setValue(0);
    Animated.timing(spinAnim, {
      toValue: 1, duration: 800, easing: Easing.out(Easing.cubic), useNativeDriver: true,
    }).start();

    fetchRecipe({ variables: { excludeIds: seenIds } });
  }, [phase, loading, seenIds, spinCount]);

  const spinRotate = spinAnim.interpolate({
    inputRange:  [0, 1],
    outputRange: ["0deg", "360deg"],
  });

  const spinsLeft = MAX_SPINS - spinCount;
  const isLocked  = phase === "locked";

  return (
    <LinearGradient
      colors={[colors.gradientStart, colors.gradientEnd]}
      style={styles.gradient}
    >
      <StatusBar barStyle="light-content" />
      <SafeAreaView style={styles.safe}>

        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.appName}>Tonight</Text>
          <Text style={styles.appSub}>by Savor</Text>
        </View>

        {/* Centre content */}
        <View style={styles.centre}>
          <Animated.Text style={[styles.fruitIcon, { transform: [{ rotate: spinRotate }] }]}>
            🍊
          </Animated.Text>

          <Text style={styles.headline}>
            {isLocked
              ? "That's your three."
              : spinCount === 0
              ? "What's for dinner?"
              : "Not feeling it?"}
          </Text>

          <Text style={styles.subline}>
            {isLocked
              ? "Pick one and get cooking."
              : spinCount === 0
              ? "Tap to get a random recipe from the Savor community."
              : `${spinsLeft} spin${spinsLeft === 1 ? "" : "s"} left.`}
          </Text>
        </View>

        {/* CTA */}
        <View style={styles.bottom}>
          {isLocked ? (
            <TouchableOpacity
              style={styles.lockedButton}
              onPress={() => navigation.navigate("Done")}
              activeOpacity={0.8}
            >
              <Text style={styles.lockedLabel}>See Savor →</Text>
            </TouchableOpacity>
          ) : (
            <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
              <TouchableOpacity
                style={[styles.spinButton, loading && styles.spinButtonLoading]}
                onPress={handleSpin}
                activeOpacity={0.85}
                disabled={loading}
              >
                <Text style={styles.spinLabel}>
                  {loading ? "Finding one…" : spinCount === 0 ? "Spin" : "Spin again"}
                </Text>
              </TouchableOpacity>
            </Animated.View>
          )}

          {/* Spin counter dots */}
          {!isLocked && (
            <View style={styles.dots}>
              {Array.from({ length: MAX_SPINS }).map((_, i) => (
                <View
                  key={i}
                  style={[styles.dot, i < spinCount && styles.dotUsed]}
                />
              ))}
            </View>
          )}
        </View>

      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: { flex: 1 },
  safe:     { flex: 1, paddingHorizontal: 28 },

  header: {
    marginTop: 16,
    alignItems: "center",
  },
  appName: {
    fontFamily:  "RalewayBold",
    fontSize:    36,
    color:       colors.white,
    letterSpacing: 1,
  },
  appSub: {
    fontFamily:  "Raleway",
    fontSize:    13,
    color:       "rgba(255,255,255,0.7)",
    letterSpacing: 2,
    textTransform: "uppercase",
    marginTop:   2,
  },

  centre: {
    flex:           1,
    alignItems:     "center",
    justifyContent: "center",
    gap:            20,
  },
  fruitIcon: {
    fontSize: 72,
    marginBottom: 8,
  },
  headline: {
    fontFamily:  "RalewayBold",
    fontSize:    28,
    color:       colors.white,
    textAlign:   "center",
    lineHeight:  34,
  },
  subline: {
    fontFamily: "Raleway",
    fontSize:   16,
    color:      "rgba(255,255,255,0.8)",
    textAlign:  "center",
    lineHeight: 24,
    maxWidth:   280,
  },

  bottom: {
    paddingBottom: 32,
    alignItems:    "center",
    gap:           20,
  },
  spinButton: {
    backgroundColor: colors.white,
    paddingVertical:   18,
    paddingHorizontal: 64,
    borderRadius:      40,
    elevation:         4,
    shadowColor:       colors.black,
    shadowOffset:      { width: 0, height: 3 },
    shadowOpacity:     0.18,
    shadowRadius:      8,
  },
  spinButtonLoading: {
    opacity: 0.75,
  },
  spinLabel: {
    fontFamily: "RalewayBold",
    fontSize:   20,
    color:      colors.primary,
  },
  lockedButton: {
    borderWidth:       2,
    borderColor:       colors.white,
    paddingVertical:   16,
    paddingHorizontal: 48,
    borderRadius:      40,
  },
  lockedLabel: {
    fontFamily: "RalewayBold",
    fontSize:   18,
    color:      colors.white,
  },

  dots: {
    flexDirection: "row",
    gap:           10,
  },
  dot: {
    width:        10,
    height:       10,
    borderRadius: 5,
    backgroundColor: "rgba(255,255,255,0.35)",
  },
  dotUsed: {
    backgroundColor: colors.white,
  },
});
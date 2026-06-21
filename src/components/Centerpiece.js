import React, { useState, useRef, useEffect } from "react";
import { View, StyleSheet, Animated, Easing, Text, Image, TouchableOpacity } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Icon } from "react-native-paper";
import * as Haptics from "expo-haptics";

import { colors, tealAlpha } from "../constants/colors";

const SPIN_DURATION = 1800;

const REEL_SYMBOLS = [
  "🍳",
  "🥗",
  "🍝",
  "🍕",
  "🍔",
  "🍜",
  "🥘",
  "🍱",
  "🌮",
  "🥐",
  "🍣",
  "🍲",
  "🥩",
  "🍰",
  "🦞",
  "🌯",
  "🍛",
  "🫕",
];

// One housing, three contents. Teal cabinet, orange win-lights.
//   idle     → wheel, floating (no housing, no shadow)
//   spinning → housing lifts in; emoji cycle behind the glass; reel-click haptics
//   revealed → photo lands behind the same glass; gold markers flash; badge + share appear
export default function Centerpiece({ phase, recipe, size, badge, onShare }) {
  const spinnerRot = useRef(new Animated.Value(0)).current;
  const wheelOpacity = useRef(new Animated.Value(1)).current;
  const reelOpacity = useRef(new Animated.Value(0)).current;
  const cardOpacity = useRef(new Animated.Value(0)).current;
  const bezelOpacity = useRef(new Animated.Value(0)).current;
  const markerOpacity = useRef(new Animated.Value(0)).current;
  const lockScale = useRef(new Animated.Value(1)).current;
  const glow = useRef(new Animated.Value(0)).current;

  const [symbol, setSymbol] = useState("🍳");
  const tickRef = useRef(null);
  const rotRef = useRef(0);
  const prevPhase = useRef(phase);

  const SP = size * 0.72;

  const stopCycle = () => {
    if (tickRef.current) clearTimeout(tickRef.current);
  };
  const startCycle = () => {
    let step = 0;
    const tick = () => {
      step++;
      const interval = 55 + Math.min(step / 40, 1) * 150;
      setSymbol((p) => {
        let n;
        do {
          n = REEL_SYMBOLS[Math.floor(Math.random() * REEL_SYMBOLS.length)];
        } while (n === p && REEL_SYMBOLS.length > 1);
        return n;
      });
      if (interval > 120) Haptics.selectionAsync().catch(() => {});
      tickRef.current = setTimeout(tick, interval);
    };
    tickRef.current = setTimeout(tick, 55);
  };

  useEffect(() => {
    const prev = prevPhase.current;
    prevPhase.current = phase;

    if (phase === "spinning") {
      rotRef.current += 3 * 360;
      Animated.timing(spinnerRot, {
        toValue: rotRef.current,
        duration: SPIN_DURATION,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();
      lockScale.setValue(1);
      Animated.parallel([
        Animated.timing(wheelOpacity, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(cardOpacity, {
          toValue: 0,
          duration: 160,
          useNativeDriver: true,
        }),
        Animated.timing(reelOpacity, {
          toValue: 1,
          duration: 200,
          delay: 80,
          useNativeDriver: true,
        }),
        Animated.timing(bezelOpacity, {
          toValue: 1,
          duration: 220,
          useNativeDriver: true,
        }),
        Animated.timing(markerOpacity, {
          toValue: 0.85,
          duration: 220,
          useNativeDriver: true,
        }),
      ]).start();
      startCycle();
    } else if (phase === "revealed") {
      stopCycle();
      const doPop = prev === "spinning";
      cardOpacity.setValue(0);
      if (doPop) lockScale.setValue(0.86);
      Animated.parallel([
        Animated.timing(reelOpacity, {
          toValue: 0,
          duration: 160,
          useNativeDriver: true,
        }),
        Animated.timing(wheelOpacity, {
          toValue: 0,
          duration: 160,
          useNativeDriver: true,
        }),
        Animated.timing(bezelOpacity, {
          toValue: 1,
          duration: 160,
          useNativeDriver: true,
        }),
        Animated.timing(cardOpacity, {
          toValue: 1,
          duration: 300,
          delay: 50,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.spring(lockScale, {
          toValue: 1,
          friction: 4.5,
          tension: 320,
          useNativeDriver: true,
        }),
      ]).start();
      if (doPop) {
        Animated.sequence([
          Animated.timing(markerOpacity, {
            toValue: 1,
            duration: 80,
            delay: 40,
            useNativeDriver: true,
          }),
          Animated.timing(markerOpacity, {
            toValue: 0.9,
            duration: 420,
            easing: Easing.out(Easing.quad),
            useNativeDriver: true,
          }),
        ]).start();
        Animated.sequence([
          Animated.timing(glow, {
            toValue: 1,
            duration: 60,
            delay: 40,
            useNativeDriver: true,
          }),
          Animated.timing(glow, {
            toValue: 0,
            duration: 420,
            easing: Easing.out(Easing.quad),
            useNativeDriver: true,
          }),
        ]).start();
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => {});
      } else {
        markerOpacity.setValue(0.9);
      }
    } else {
      stopCycle();
      Animated.parallel([
        Animated.timing(wheelOpacity, {
          toValue: 1,
          duration: 220,
          useNativeDriver: true,
        }),
        Animated.timing(reelOpacity, {
          toValue: 0,
          duration: 160,
          useNativeDriver: true,
        }),
        Animated.timing(cardOpacity, {
          toValue: 0,
          duration: 160,
          useNativeDriver: true,
        }),
        Animated.timing(bezelOpacity, {
          toValue: 0,
          duration: 220,
          useNativeDriver: true,
        }),
        Animated.timing(markerOpacity, {
          toValue: 0,
          duration: 160,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [phase]);

  useEffect(() => {
    rotRef.current = 2.4 * 360;
    Animated.timing(spinnerRot, {
      toValue: rotRef.current,
      duration: 1400,
      delay: 400,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
    return stopCycle;
  }, []);

  const rotate = spinnerRot.interpolate({
    inputRange: [0, 360],
    outputRange: ["0deg", "360deg"],
  });

  return (
    <Animated.View
      style={[
        cp.wrap,
        { width: size, height: size, transform: [{ scale: lockScale }] },
      ]}
    >
      {/* Drop shadow / lift — follows the housing so the idle wheel floats free */}
      <Animated.View
        style={[StyleSheet.absoluteFill, cp.lift, { opacity: bezelOpacity }]}
      />

      <View style={[StyleSheet.absoluteFill, cp.frame]}>
        {/* Wheel face */}
        <Animated.View
          style={[
            StyleSheet.absoluteFill,
            cp.center,
            { opacity: wheelOpacity },
          ]}
          pointerEvents="none"
        >
          <Animated.Image
            source={require("../../assets/spinner.png")}
            resizeMode="contain"
            style={{
              position: "absolute",
              width: SP,
              height: SP,
              top: (size - SP) / 1.4,
              left: (size - SP) / 2,
              transform: [{ rotate }],
            }}
          />
          <Image
            source={require("../../assets/outer.png")}
            resizeMode="contain"
            style={{ width: size, height: size }}
          />
        </Animated.View>

        {/* Reel face */}
        <Animated.View
          style={[
            StyleSheet.absoluteFill,
            cp.reelGround,
            { opacity: reelOpacity },
          ]}
          pointerEvents="none"
        >
          <Text style={cp.symbol}>{symbol}</Text>
        </Animated.View>

        {/* Card face */}
        <Animated.View
          style={[StyleSheet.absoluteFill, { opacity: cardOpacity }]}
          pointerEvents="none"
        >
          {recipe?.image ? (
            <Image
              source={{ uri: recipe.image }}
              resizeMode="cover"
              fadeDuration={0}
              style={StyleSheet.absoluteFill}
            />
          ) : (
            <View
              style={[
                StyleSheet.absoluteFill,
                cp.center,
                { backgroundColor: colors.primary + "15" },
              ]}
            >
              <Text style={{ fontSize: size * 0.28 }}>🍽️</Text>
            </View>
          )}
          <LinearGradient
            colors={["transparent", tealAlpha(0.9)]}
            start={{ x: 0.5, y: 0.4 }}
            end={{ x: 0.5, y: 1 }}
            style={cp.scrim}
          />
          <Text style={cp.cardTitle} numberOfLines={2}>
            {recipe?.name}
          </Text>
        </Animated.View>

        {/* Teal housing — lit glass instead of two flat bars:
    top = teal rim giving way to a specular sheen; bottom = teal pooling at the foot */}
        <Animated.View
          style={[StyleSheet.absoluteFill, cp.bezel, { opacity: bezelOpacity }]}
          pointerEvents="none"
        >
          <LinearGradient
            colors={[
              tealAlpha(0.2),
              "rgba(255,255,255,0.26)",
              "rgba(255,255,255,0)",
            ]}
            locations={[0, 0.18, 1]}
            start={{ x: 0.5, y: 0 }}
            end={{ x: 0.5, y: 1 }}
            style={cp.glassSheen}
          />
          <LinearGradient
            colors={[tealAlpha(0), tealAlpha(0.28)]}
            start={{ x: 0.5, y: 0 }}
            end={{ x: 0.5, y: 1 }}
            style={cp.glassFloor}
          />
        </Animated.View>

        {/* Gold win-row markers */}
        <Animated.View
          style={[cp.markerLeft, { opacity: markerOpacity }]}
          pointerEvents="none"
        />
        <Animated.View
          style={[cp.markerRight, { opacity: markerOpacity }]}
          pointerEvents="none"
        />

        {/* Win glow */}
        <Animated.View
          pointerEvents="none"
          style={[
            StyleSheet.absoluteFill,
            {
              backgroundColor: colors.orange,
              opacity: glow.interpolate({
                inputRange: [0, 1],
                outputRange: [0, 0.22],
              }),
            },
          ]}
        />

        {/* Reading badge + share — live on the card itself, only when revealed */}
        {phase === "revealed" && (
          <>
            {badge ? (
              <Animated.View
                style={[cp.badge, { opacity: cardOpacity }]}
                pointerEvents="none"
              >
                <Text style={cp.badgeText}>{badge}</Text>
              </Animated.View>
            ) : null}

            <Animated.View style={[cp.shareWrap, { opacity: cardOpacity }]}>
              <TouchableOpacity
                onPress={onShare}
                style={cp.shareBtn}
                activeOpacity={0.7}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Icon source="share-variant" size={17} color="#fff" />
              </TouchableOpacity>
            </Animated.View>
          </>
        )}
      </View>
    </Animated.View>
  );
}

const cp = StyleSheet.create({
  wrap: { alignItems: "center", justifyContent: "center" },

  lift: {
    borderRadius: 26,
    backgroundColor: "#fff",
    shadowColor: colors.teal,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.18,
    shadowRadius: 16,
    elevation: 12,
  },

  frame: {
    borderRadius: 26,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },
  center: { alignItems: "center", justifyContent: "center" },
  reelGround: {
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
  },
  symbol: { fontSize: 96, lineHeight: 104 },

  scrim: { position: "absolute", left: 0, right: 0, bottom: 0, height: "60%" },
  cardTitle: {
    position: "absolute",
    left: 16,
    right: 16,
    bottom: 16,
    fontFamily: "RalewayBold",
    fontSize: 22,
    lineHeight: 27,
    color: "#fff",
  },

  // Teal cabinet — deeper border + tinted glass so the gold markers pop against it.
  bezel: {
    borderRadius: 26,
    borderWidth: 3,
    borderColor: tealAlpha(0.55),
  },
  glassSheen: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: "34%",
  },
  glassFloor: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: "30%",
  },

  markerLeft: {
    position: "absolute",
    left: 6,
    top: "50%",
    marginTop: -7,
    width: 0,
    height: 0,
    borderTopWidth: 7,
    borderBottomWidth: 7,
    borderLeftWidth: 10,
    borderTopColor: "transparent",
    borderBottomColor: "transparent",
    borderLeftColor: colors.gold,
  },
  markerRight: {
    position: "absolute",
    right: 6,
    top: "50%",
    marginTop: -7,
    width: 0,
    height: 0,
    borderTopWidth: 7,
    borderBottomWidth: 7,
    borderRightWidth: 10,
    borderTopColor: "transparent",
    borderBottomColor: "transparent",
    borderRightColor: colors.gold,
  },

  badge: {
    position: "absolute",
    top: 10,
    left: 10,
    backgroundColor: tealAlpha(0.82),
    borderRadius: 8,
    paddingHorizontal: 9,
    paddingVertical: 5,
  },
  badgeText: {
    fontFamily: "RalewayBold",
    fontSize: 10,
    letterSpacing: 1,
    color: "#fff",
  },

  shareWrap: { position: "absolute", top: 10, right: 10 },
  shareBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: tealAlpha(0.55),
    alignItems: "center",
    justifyContent: "center",
  },
});

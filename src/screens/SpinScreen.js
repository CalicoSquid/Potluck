import React, { useState, useRef, useCallback, useEffect } from "react";
import {
  View,
  StyleSheet,
  Animated,
  Easing,
  StatusBar,
  Text,
  Image,
  TouchableOpacity,
  Dimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useLazyQuery } from "@apollo/client/react";
import { gql } from "@apollo/client";
import * as Haptics from "expo-haptics";
import AsyncStorage from "@react-native-async-storage/async-storage";

import { colors } from "../constants/colors";
import TonightButton from "../components/TonightButton";
import PotluckHeader from "../components/PotluckHeader";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

// Wordmark is 532x150 — aspect ~3.55. Sized to a comfortable width.
const WORDMARK_WIDTH  = SCREEN_WIDTH * 0.62;
const WORDMARK_ASPECT = 532 / 150;
const WORDMARK_HEIGHT = WORDMARK_WIDTH / WORDMARK_ASPECT;

const LOGO_SIZE     = SCREEN_WIDTH * 0.72;
const SPINNER_SIZE  = LOGO_SIZE * 0.72;
const MAX_SPINS     = 3;
const SPIN_DURATION = 1800;
const STORAGE_KEY   = "potluck_session";

const REEL_GAP    = 10;
const REEL_WIDTH  = (SCREEN_WIDTH - 32 - REEL_GAP * 2) / 3;
const REEL_HEIGHT = 84;

// How long the scroll-up animation takes
const REEL_ANIM_MS   = 700;
// Pause after landing before nav fires — let user see the result
const REEL_HOLD_MS   = 500;

// ── Copy pools ────────────────────────────────────────────────────────────────

const IDLE_HEADLINES = [
  "Spin For Your Supper!",
  "What's on the menu?",
  "Feeling lucky, chef?",
  "Leave it to fate.",
  "Let the wheel decide.",
  "No plans? No problem.",
];

const IDLE_SUBLINES = [
  "No scrolling. No deciding. Just cook.",
  "One spin. One recipe. Done.",
  "The community picked it. You cook it.",
  "Dinner sorted in seconds.",
];

const MID_HEADLINES = [
  "Not feeling it?",
  "Uninspired?",
  "Not quite right?",
  "Keep going?",
  "Nearly there.",
];

const MID_SUBLINES = (n) => [
  `${n} spin${n === 1 ? "" : "s"} left — make it count.`,
  `${n} more. Choose wisely.`,
  `${n} left. No pressure.`,
];

const CAP_HEADLINES = [
  "That's your three.",
  "Three spins. That's the deal.",
  "The wheel has spoken.",
  "Alright, you've seen enough.",
];

const CAP_CHEEKS = [
  "Surely one of those will do?",
  "The wheel tried its best.",
  "Three great options right there.",
  "Even professional chefs pick from three.",
];

const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

// ── GraphQL ───────────────────────────────────────────────────────────────────

const RANDOM_RECIPE = gql`
  query RandomRecipe($excludeIds: [ID]) {
    randomRecipe(excludeIds: $excludeIds) {
      id name description image ingredients instructions
      recipeYield category cuisine
      times {
        cook { hours minutes }
        prep { hours minutes }
        total { hours minutes }
      }
    }
  }
`;

// ── Brand palette extracted from the Savor logo asset ────────────────────────
// Dark teal #142829, Savor green #4caf50, orange #ff9f13, warm cream #ffeacb
// These live in the logo itself — we honour them, not fight them.

const BRAND = {
  teal:   "#142829",   // logo outline / dark text
  green:  "#4caf50",   // logo leaf accent
  orange: "#FF9800",   // Savor primary gradient end
};

// Per-reel accent colours — orange → green → teal
// Cycles through brand palette. Small detail, intentional personality.
const NOTCH_COLORS = [BRAND.orange, BRAND.green, BRAND.teal];

// ── Reel symbol pool ──────────────────────────────────────────────────────────

const SPIN_SYMBOLS = [
  "🍳","🥗","🍝","🍕","🍔","🍜","🥘","🍱","🌮",
  "🥐","🍣","🍲","🥩","🍰","🦞","🌯","🍛","🫕",
];

const SPIN_INTERVAL_START = 55;   // ms — peak speed
const SPIN_INTERVAL_END   = 190;  // ms — just before snap

// ── Slot reel ─────────────────────────────────────────────────────────────────

const SlotReel = ({ recipe, isSpinning, index, onPress, onLocked }) => {
  const lockAnim  = useRef(new Animated.Value(1)).current;
  const glowAnim  = useRef(new Animated.Value(0)).current;
  const nameFade  = useRef(new Animated.Value(recipe ? 1 : 0)).current;
  const lockedRef = useRef(!!recipe);

  const [spinSymbol, setSpinSymbol] = useState(null);

  // Cycle symbols while this slot is the active spin target
  useEffect(() => {
    if (!isSpinning || lockedRef.current) return;

    let step = 0;
    const totalSteps = Math.round(SPIN_DURATION / SPIN_INTERVAL_START);
    const tickRef = { current: null };

    const tick = () => {
      step++;
      setSpinSymbol(prev => {
        let next;
        do { next = SPIN_SYMBOLS[Math.floor(Math.random() * SPIN_SYMBOLS.length)]; }
        while (next === prev && SPIN_SYMBOLS.length > 1);
        return next;
      });
      const progress = Math.min(step / totalSteps, 1);
      const delay = SPIN_INTERVAL_START + (SPIN_INTERVAL_END - SPIN_INTERVAL_START) * progress;
      tickRef.current = setTimeout(tick, delay);
    };

    tickRef.current = setTimeout(tick, SPIN_INTERVAL_START);
    return () => clearTimeout(tickRef.current);
  }, [isSpinning]);

  // Recipe landed — snap to logo + fire animations
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

    // Scale pop — overshoots slightly then settles
    lockAnim.setValue(0.84);
    Animated.spring(lockAnim, {
      toValue: 1, friction: 3.5, tension: 340, useNativeDriver: true,
    }).start();

    // Orange flash — brief, not garish
    Animated.sequence([
      Animated.timing(glowAnim, { toValue: 1, duration: 60,  useNativeDriver: true }),
      Animated.timing(glowAnim, { toValue: 0, duration: 420, easing: Easing.out(Easing.quad), useNativeDriver: true }),
    ]).start();

    // Name rises in below
    Animated.timing(nameFade, {
      toValue: 1, duration: 280, delay: 200,
      easing: Easing.out(Easing.quad), useNativeDriver: true,
    }).start();

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    setTimeout(() => onLocked?.(), REEL_HOLD_MS);
  }, [recipe?.id]);

  const isFilled    = !!recipe;
  const isActiveReel = isSpinning && !lockedRef.current;
  const notchColor  = NOTCH_COLORS[index];

  // ── Window content — three clean states ──────────────────────────────────

  const windowContent = (() => {

    // LOCKED — white card, full-colour Savor icon, no gradients
    if (isFilled) {
      return (
        <Animated.View style={[reelStyles.logoWrap, { transform: [{ scale: lockAnim }] }]}>
          {/* Orange flash overlay on landing */}
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
            style={reelStyles.lockedLogo}
            resizeMode="contain"
          />
        </Animated.View>
      );
    }

    // SPINNING — white, big emoji tumbling
    if (isActiveReel && spinSymbol) {
      return (
        <View style={reelStyles.spinWindow}>
          <Text style={reelStyles.spinEmoji}>{spinSymbol}</Text>
        </View>
      );
    }

    // IDLE — white, dark teal question mark, clean
    return (
      <View style={reelStyles.idleWindow}>
        <Text style={reelStyles.idleQ}>?</Text>
      </View>
    );
  })();

  // ── Frame — white card, no colour until filled ────────────────────────────

  const frameStyle = [
    reelStyles.frame,
    isFilled && reelStyles.frameFilled,
  ];

  if (!isFilled) {
    return (
      <View style={reelStyles.column}>
        <View style={frameStyle}>
          <View style={[reelStyles.notch, { backgroundColor: notchColor }]} />
          <View style={reelStyles.window}>{windowContent}</View>
        </View>
        <View style={reelStyles.namePlaceholder} />
      </View>
    );
  }

  return (
    <View style={reelStyles.column}>
      <TouchableOpacity onPress={onPress} activeOpacity={0.8} style={frameStyle}>
        <View style={[reelStyles.notch, { backgroundColor: notchColor }]} />
        <View style={reelStyles.window}>{windowContent}</View>
      </TouchableOpacity>

      <Animated.Text
        style={[reelStyles.nameStrip, { opacity: nameFade }]}
        numberOfLines={2}
      >
        {recipe.name}
      </Animated.Text>
    </View>
  );
};

const reelStyles = StyleSheet.create({
  // Column so name strip flows naturally below the card
  column: {
    width:      REEL_WIDTH,
    alignItems: "center",
  },

  // White card — pure Savor DNA, no colored borders
  frame: {
    width:           REEL_WIDTH,
    height:          REEL_HEIGHT,
    borderRadius:    16,
    backgroundColor: "#ffffff",
    borderWidth:     1,
    borderColor:     "#f0ebe6",      // Savor warm border, no gray
    padding:         3,
    elevation:       2,
    shadowColor:     "#1a1a1a",
    shadowOffset:    { width: 0, height: 2 },
    shadowOpacity:   0.08,
    shadowRadius:    6,
    position:        "relative",
  },

  // Filled card — lift it, teal shadow for depth
  frameFilled: {
    elevation:     5,
    shadowColor:   BRAND.teal,
    shadowOpacity: 0.16,
    shadowRadius:  10,
    shadowOffset:  { width: 0, height: 4 },
    borderColor:   "#f0ebe6",
  },

  // Accent tab — left edge, per-reel brand colour
  notch: {
    position:               "absolute",
    left:                   0,
    top:                    12,
    bottom:                 12,
    width:                  3,
    borderTopRightRadius:   2,
    borderBottomRightRadius:2,
    zIndex:                 2,
  },

  // Inner window — borderRadius matches frame minus padding
  window: {
    flex:            1,
    borderRadius:    13,
    overflow:        "hidden",
    backgroundColor: "#ffffff",
  },

  // IDLE — white bg, dark teal ?
  idleWindow: {
    flex:           1,
    alignItems:     "center",
    justifyContent: "center",
    backgroundColor:"#ffffff",
  },
  idleQ: {
    fontFamily: "RalewayBold",
    fontSize:   30,
    color:      BRAND.teal,
    opacity:    0.35,
  },

  // SPINNING — white bg, emoji pops cleanly on white
  spinWindow: {
    flex:           1,
    alignItems:     "center",
    justifyContent: "center",
    backgroundColor:"#ffffff",
  },
  spinEmoji: {
    fontSize:   32,
    lineHeight: 38,
  },

  // LOCKED — white bg, logo centred, no gradient
  logoWrap: {
    flex:           1,
    alignItems:     "center",
    justifyContent: "center",
    backgroundColor:"#ffffff",
    borderRadius:   13,
    overflow:       "hidden",
  },
  lockedLogo: {
    width:  REEL_HEIGHT * 0.62,
    height: REEL_HEIGHT * 0.62,
  },

  // Recipe name — dark teal, bold, below the card
  nameStrip: {
    fontFamily:    "RalewayBold",
    fontSize:      10,
    color:         BRAND.teal,
    marginTop:     6,
    textAlign:     "center",
    letterSpacing: 0.1,
    lineHeight:    13,
    width:         "100%",
    minHeight:     26,   // 2 lines reserved — no layout jump
  },

  // Placeholder when empty — matches nameStrip height
  namePlaceholder: {
    height: 32,  // nameStrip minHeight + marginTop
  },
});


// ── Main screen ───────────────────────────────────────────────────────────────

export default function SpinScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const [spinCount,      setSpinCount]      = useState(0);
  const [seenIds,        setSeenIds]        = useState([]);
  const [phase,          setPhase]          = useState("idle");
  const [slots,          setSlots]          = useState([null, null, null]);
  const [displayedCount, setDisplayedCount] = useState(0);
  // Pending nav — held until reel animation completes
  const pendingNav = useRef(null);

  const [copy, setCopy] = useState(() => ({
    idleHeadline: pick(IDLE_HEADLINES),
    idleSubline:  pick(IDLE_SUBLINES),
    midHeadline:  pick(MID_HEADLINES),
    midSubline:   pick(MID_SUBLINES(MAX_SPINS - 1)),
    capHeadline:  pick(CAP_HEADLINES),
    capCheek:     pick(CAP_CHEEKS),
  }));

  const scaleAnim       = useRef(new Animated.Value(1)).current;
  const spinAnim        = useRef(new Animated.Value(0)).current;
  const currentRotation = useRef(0);

  // Entry animation — demo spin on mount
  useEffect(() => {
    const t = setTimeout(() => {
      const demoTarget = 2.4 * 360;
      Animated.timing(spinAnim, {
        toValue:  demoTarget,
        duration: 1400,
        easing:   Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();
      currentRotation.current = demoTarget;
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }, 400);
    return () => clearTimeout(t);
  }, []);

  // Restore session
  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((raw) => {
      if (!raw) return;
      try {
        const session = JSON.parse(raw);
        if (session.slots && session.spinCount > 0) {
          setSlots(session.slots);
          setSpinCount(session.spinCount);
          setDisplayedCount(session.spinCount);
          setSeenIds(session.seenIds || []);
          setPhase(session.spinCount >= MAX_SPINS ? "softCap" : "revealed");
        }
      } catch (_) {}
    });
  }, []);

  const [fetchRecipe, { loading }] = useLazyQuery(RANDOM_RECIPE, {
    fetchPolicy: "no-cache",
  });

  // Called by SlotReel once its lock animation + hold is done
  const handleReelLocked = useCallback(() => {
    if (pendingNav.current) {
      const nav = pendingNav.current;
      pendingNav.current = null;
      navigation.navigate("Recipe", nav);
    }
  }, [navigation]);

  const handleReset = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    AsyncStorage.removeItem(STORAGE_KEY);
    pendingNav.current = null;
    setSpinCount(0);
    setSeenIds([]);
    setDisplayedCount(0);
    setSlots([null, null, null]);
    setPhase("idle");
    setCopy({
      idleHeadline: pick(IDLE_HEADLINES),
      idleSubline:  pick(IDLE_SUBLINES),
      midHeadline:  pick(MID_HEADLINES),
      midSubline:   pick(MID_SUBLINES(MAX_SPINS - 1)),
      capHeadline:  pick(CAP_HEADLINES),
      capCheek:     pick(CAP_CHEEKS),
    });
  }, []);

  const handleSpin = useCallback(() => {
    if (phase === "spinning" || loading) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setPhase("spinning");

    Animated.sequence([
      Animated.timing(scaleAnim, { toValue: 0.94, duration: 100, easing: Easing.out(Easing.quad), useNativeDriver: true }),
      Animated.timing(scaleAnim, { toValue: 1,    duration: 220, easing: Easing.out(Easing.back(2)), useNativeDriver: true }),
    ]).start();

    const fetchPromise = fetchRecipe({ variables: { excludeIds: seenIds } });
    const extraSpins   = 4 + Math.random();
    const targetDeg    = currentRotation.current + extraSpins * 360;
    currentRotation.current = targetDeg;

    const animPromise = new Promise((resolve) => {
      Animated.timing(spinAnim, {
        toValue: targetDeg, duration: SPIN_DURATION,
        easing: Easing.out(Easing.cubic), useNativeDriver: true,
      }).start(resolve);
    });

    Promise.all([fetchPromise, animPromise]).then(([{ data, error }]) => {
      if (error) {
        console.log("❌ error:", JSON.stringify(error));
        setPhase(spinCount > 0 ? "revealed" : "idle");
        return;
      }
      const recipe = data?.randomRecipe;
      if (!recipe) { setPhase(spinCount > 0 ? "revealed" : "idle"); return; }

      const nextCount = spinCount + 1;
      const nextSeen  = [...seenIds, recipe.id];
      const nextSlots = slots.map((s, i) => i === nextCount - 1 ? recipe : s);
      const isCap     = nextCount >= MAX_SPINS;

      setSeenIds(nextSeen);
      setSpinCount(nextCount);
      setDisplayedCount(nextCount);
      setSlots(nextSlots);
      setPhase(isCap ? "softCap" : "revealed");

      if (!isCap) setCopy(prev => ({ ...prev, midSubline: pick(MID_SUBLINES(MAX_SPINS - nextCount)) }));

      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ slots: nextSlots, spinCount: nextCount, seenIds: nextSeen }));

      // Store nav params — SlotReel will fire it after its animation
      pendingNav.current = { recipe, spinCount: nextCount, seenIds: nextSeen, isLast: false };

    }).catch((err) => {
      console.log("❌ catch:", JSON.stringify(err));
      setPhase(spinCount > 0 ? "revealed" : "idle");
    });
  }, [phase, loading, seenIds, spinCount, slots]);

  const spinRotate = spinAnim.interpolate({ inputRange: [0, 360], outputRange: ["0deg", "360deg"] });

  const isSpinning = phase === "spinning";
  const isSoftCap  = phase === "softCap";
  const hasSpun    = displayedCount > 0;
  const headline   = hasSpun && !isSoftCap ? copy.midHeadline : copy.idleHeadline;
  const subline    = hasSpun && !isSoftCap ? copy.midSubline  : copy.idleSubline;

  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" translucent backgroundColor="transparent" />

      <PotluckHeader spinCount={displayedCount} />

      <View style={styles.body}>

        {/* ── Wordmark ── */}
        <View style={styles.wordmarkSlot}>
          <Image
            source={require("../../assets/wordmark2.png")}
            style={{ width: WORDMARK_WIDTH, height: WORDMARK_HEIGHT }}
            resizeMode="contain"
          />
        </View>

        {/* ── Prize wheel ── */}
        <View style={styles.wheelSlot}>
          <View style={styles.wheelShadow}>
            <Animated.Image
              source={require("../../assets/spinner.png")}
              style={[styles.spinnerImg, {
                width:     SPINNER_SIZE,
                height:    SPINNER_SIZE,
                top:       (LOGO_SIZE - SPINNER_SIZE) / 1.4,
                left:      (LOGO_SIZE - SPINNER_SIZE) / 2,
                transform: [{ rotate: spinRotate }],
              }]}
              resizeMode="contain"
            />
            <Image
              source={require("../../assets/outer.png")}
              style={{ width: LOGO_SIZE, height: LOGO_SIZE }}
              resizeMode="contain"
            />
          </View>
        </View>

        {/* ── Messaging — fixed height to prevent reflow ── */}
        <View style={styles.messaging}>
          <Text style={styles.headline} numberOfLines={1}>
            {isSoftCap ? copy.capHeadline : headline}
          </Text>
          <Text style={styles.subline} numberOfLines={2}>
            {isSoftCap ? copy.capCheek : subline}
          </Text>
        </View>

        {/* ── Slot machine reels ── */}
        <View style={styles.reelsMachine}>
          <View style={styles.reelsRow}>
            <View style={styles.winLine} />
            {slots.map((recipe, i) => (
              <SlotReel
                key={i}
                index={i}
                recipe={recipe}
                isSpinning={isSpinning}
                onLocked={handleReelLocked}
                onPress={() => recipe && navigation.navigate("Recipe", {
                  recipe, spinCount, seenIds, isLast: false,
                })}
              />
            ))}
          </View>
        </View>

        {/* ── CTA slot — fixed height, holds button OR reset link ── */}
        <View style={styles.ctaSlot}>
          {isSoftCap ? (
            <TouchableOpacity
              onPress={handleReset}
              activeOpacity={0.6}
              style={styles.resetBtn}
              hitSlop={{ top: 12, bottom: 12, left: 24, right: 24 }}
            >
              <Text style={styles.resetLabel}>← Start over</Text>
            </TouchableOpacity>
          ) : (
            <Animated.View style={[styles.ctaWrap, { transform: [{ scale: scaleAnim }] }]}>
              <TonightButton
                icon="dice-multiple"
                title={hasSpun ? "Spin again" : "Spin"}
                subtitle={
                  isSpinning ? "The wheel decides…"
                    : hasSpun ? "Get another random recipe"
                    : "Get a random community recipe"
                }
                onPress={handleSpin}
                loading={isSpinning}
              />
            </Animated.View>
          )}
        </View>

        {/* ── Footer ── */}
        <Text
          style={[styles.footer, { marginBottom: Math.max(insets.bottom, 12) }]}
          numberOfLines={1}
        >
          Recipes by the Savor community
        </Text>
      </View>
    </View>
  );
}

// ── Styles ───────────────────────────────────────────────────────────────────
//
// Layout philosophy: deliberate vertical rhythm, no flex spacers.
// Each section has a fixed slot so toggling between Spin / Start over
// states does not cause the page to reflow.
//
// Spacing scale: 8 / 12 / 16 / 20 / 24

const styles = StyleSheet.create({
  root: {
    flex:            1,
    backgroundColor: colors.offWhite,
  },
  body: {
    flex:              1,
    alignItems:        "center",
    paddingHorizontal: 16,
  },

  // ── Wordmark sits at the top, breathing room above the wheel ───────────
  wordmarkSlot: {
    paddingTop:    28,
    paddingBottom: 4,
    alignItems:    "center",
  },

  // ── Wheel container — fixed dimensions so layout below it is stable ────
  wheelSlot: {
    width:          LOGO_SIZE,
    height:         LOGO_SIZE,
    alignItems:     "center",
    justifyContent: "center",
  },
  wheelShadow: {
    width:         LOGO_SIZE,
    height:        LOGO_SIZE,
    position:      "relative",
    elevation:     12,
    shadowColor:   "#142829",
    shadowOffset:  { width: 0, height: 8 },
    shadowOpacity: 0.16,
    shadowRadius:  18,
  },
  spinnerImg: { position: "absolute" },

  // ── Messaging — fixed height for a stable headline/subline pair ────────
  // 28 (headline lineHeight) + 4 (gap) + 36 (2 lines of subline) = 68
  messaging: {
    height:            68,
    width:             "100%",
    alignItems:        "center",
    justifyContent:    "center",
    paddingHorizontal: 8,
    marginTop:         12,
    marginBottom:      4,
  },
  headline: {
    fontFamily: "RalewayBold",
    fontSize:   22,
    lineHeight: 28,
    color:      "#142829",
    textAlign:  "center",
  },
  subline: {
    fontFamily: "Raleway",
    fontSize:   14,
    lineHeight: 18,
    color:      "#142829",
    opacity:    0.55,
    textAlign:  "center",
    marginTop:  4,
  },

  // ── Reels ───────────────────────────────────────────────────────────────
  reelsMachine: {
    width:        "100%",
    marginTop:    8,
    marginBottom: 20,
  },
  reelsRow: {
    flexDirection:  "row",
    gap:            REEL_GAP,
    position:       "relative",
    justifyContent: "center",
  },
  // Win line — single thin orange thread
  winLine: {
    position:        "absolute",
    left:            -4,
    right:           -4,
    top:             REEL_HEIGHT / 2 - 0.5,
    height:          1,
    backgroundColor: "#FF9800",
    opacity:         0.28,
    zIndex:          0,
    pointerEvents:   "none",
  },

  // ── CTA slot — fixed height holds either button or reset link ──────────
  // TonightButton with marginVertical:8 + 16 padding × 2 + ~46 content ≈ 96
  ctaSlot: {
    width:          "100%",
    height:         96,
    justifyContent: "center",
    alignItems:     "center",
    marginTop:      "auto",   // push to bottom of available space
  },
  ctaWrap: {
    width: "100%",
  },
  resetBtn: {
    paddingVertical:   12,
    paddingHorizontal: 20,
    borderRadius:      14,
  },
  resetLabel: {
    fontFamily:    "RalewayBold",
    fontSize:      15,
    color:         "#142829",
    letterSpacing: 0.2,
  },

  // ── Footer ──────────────────────────────────────────────────────────────
  footer: {
    fontFamily:    "Raleway",
    fontSize:      11,
    color:         "#142829",
    opacity:       0.4,
    marginTop:     6,
    letterSpacing: 0.4,
    textAlign:     "center",
  },
});
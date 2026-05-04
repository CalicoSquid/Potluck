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
  Modal,
  Pressable,
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
const WORDMARK_WIDTH = SCREEN_WIDTH * 0.62;
const WORDMARK_ASPECT = 532 / 150;
const WORDMARK_HEIGHT = WORDMARK_WIDTH / WORDMARK_ASPECT;

const LOGO_SIZE = SCREEN_WIDTH * 0.72;
const SPINNER_SIZE = LOGO_SIZE * 0.72;
const MAX_SPINS = 3;
const SPIN_DURATION = 1800;
const STORAGE_KEY = "potluck_session";

const REEL_GAP = 10;
const REEL_WIDTH = (SCREEN_WIDTH - 32 - REEL_GAP * 2) / 3;
const REEL_HEIGHT = 84;

const REEL_ANIM_MS = 700;
const REEL_HOLD_MS = 500;

// ── Brand palette ─────────────────────────────────────────────────────────────

const BRAND = {
  teal: "#142829",
  green: "#4caf50",
  orange: "#FF9800",
};

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

// ── Confirm modal copy — cheeky but with the save nudge ──────────────────────

const RESET_HEADLINES = [
  "Throwing it all away?",
  "Walking away from these?",
  "Really? These look great.",
  "Starting fresh, are we?",
];

const RESET_SUBS = [
  "Save any of these to Savor first — they're gone if you reset.",
  "These recipes don't come back. Save a favourite to Savor before you bail.",
  "Once you reset, the wheel forgets everything. Worth saving one first?",
  "The wheel has no memory. Save to Savor, then reset guilt-free.",
];

const RESET_CONFIRM = [
  "Yeah, spin again",
  "Ditch them and spin",
  "Fresh spin, please",
  "Reset, I'm sure",
];

const RESET_CANCEL = [
  "Actually, keep them",
  "Wait, I'll stay",
  "No, hold on",
  "Keep my recipes",
];

const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

// ── GraphQL ───────────────────────────────────────────────────────────────────

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
      sourceUrl
      times {
        cook {
          hours
          minutes
        }
        prep {
          hours
          minutes
        }
        total {
          hours
          minutes
        }
      }
    }
  }
`;

const NOTCH_COLORS = [BRAND.orange, BRAND.green, BRAND.teal];

const SPIN_SYMBOLS = [
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

const SPIN_INTERVAL_START = 55;
const SPIN_INTERVAL_END = 190;

// ── Confirm Reset Modal ───────────────────────────────────────────────────────

const ConfirmResetModal = ({ visible, onConfirm, onCancel, hasRecipes }) => {
  const [copy] = useState(() => ({
    headline: pick(RESET_HEADLINES),
    sub: pick(RESET_SUBS),
    confirm: pick(RESET_CONFIRM),
    cancel: pick(RESET_CANCEL),
  }));

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onCancel}
    >
      <Pressable style={modalStyles.backdrop} onPress={onCancel}>
        <Pressable style={modalStyles.sheet} onPress={() => {}}>
          {/* Orange notch at top */}
          <View style={modalStyles.notch} />

          <Text style={modalStyles.headline}>{copy.headline}</Text>
          <Text style={modalStyles.sub}>{copy.sub}</Text>

          {/* Confirm — teal, subdued — this is the destructive action */}
          <TouchableOpacity
            style={modalStyles.confirmBtn}
            onPress={onConfirm}
            activeOpacity={0.75}
          >
            <Text style={modalStyles.confirmLabel}>{copy.confirm}</Text>
          </TouchableOpacity>

          {/* Cancel — orange gradient — primary, encourage them to stay */}
          <TouchableOpacity
            style={modalStyles.cancelBtn}
            onPress={onCancel}
            activeOpacity={0.8}
          >
            <Text style={modalStyles.cancelLabel}>{copy.cancel}</Text>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );
};

const modalStyles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(20,40,41,0.55)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: "#ffffff",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 28,
    paddingTop: 20,
    paddingBottom: 40,
    gap: 14,
  },
  notch: {
    alignSelf: "center",
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: BRAND.orange + "60",
    marginBottom: 8,
  },
  headline: {
    fontFamily: "RalewayBold",
    fontSize: 22,
    color: BRAND.teal,
    textAlign: "center",
    lineHeight: 28,
  },
  sub: {
    fontFamily: "Raleway",
    fontSize: 14,
    color: BRAND.teal,
    opacity: 0.65,
    textAlign: "center",
    lineHeight: 21,
    marginBottom: 6,
  },
  // Cancel = orange = encouraged action
  cancelBtn: {
    backgroundColor: BRAND.orange,
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: "center",
  },
  cancelLabel: {
    fontFamily: "RalewayBold",
    fontSize: 16,
    color: "#ffffff",
  },
  // Confirm = teal ghost = destructive but available
  confirmBtn: {
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: BRAND.teal + "30",
  },
  confirmLabel: {
    fontFamily: "RalewayBold",
    fontSize: 15,
    color: BRAND.teal,
    opacity: 0.6,
  },
});

// ── Slot reel ─────────────────────────────────────────────────────────────────

const SlotReel = ({
  recipe,
  isSpinning,
  isActiveReel,
  index,
  onPress,
  onLocked,
}) => {
  const lockAnim = useRef(new Animated.Value(1)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;
  const nameFade = useRef(new Animated.Value(recipe ? 1 : 0)).current;
  const lockedRef = useRef(!!recipe);

  const [spinSymbol, setSpinSymbol] = useState(null);

  useEffect(() => {
    if (!isSpinning || lockedRef.current) return;

    let step = 0;
    const totalSteps = Math.round(SPIN_DURATION / SPIN_INTERVAL_START);
    const tickRef = { current: null };

    const tick = () => {
      step++;
      setSpinSymbol((prev) => {
        let next;
        do {
          next = SPIN_SYMBOLS[Math.floor(Math.random() * SPIN_SYMBOLS.length)];
        } while (next === prev && SPIN_SYMBOLS.length > 1);
        return next;
      });

      // Only fire haptics from the one reel that's actually active
      if (isActiveReel && step % 3 === 0) {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
      }

      const progress = Math.min(step / totalSteps, 1);
      const delay =
        SPIN_INTERVAL_START +
        (SPIN_INTERVAL_END - SPIN_INTERVAL_START) * progress;
      tickRef.current = setTimeout(tick, delay);
    };

    tickRef.current = setTimeout(tick, SPIN_INTERVAL_START);
    return () => clearTimeout(tickRef.current);
  }, [isSpinning]);

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
      toValue: 1,
      friction: 3.5,
      tension: 340,
      useNativeDriver: true,
    }).start();

    Animated.sequence([
      Animated.timing(glowAnim, {
        toValue: 1,
        duration: 60,
        useNativeDriver: true,
      }),
      Animated.timing(glowAnim, {
        toValue: 0,
        duration: 420,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
    ]).start();

    Animated.timing(nameFade, {
      toValue: 1,
      duration: 280,
      delay: 200,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    }).start();

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    setTimeout(() => onLocked?.(), REEL_HOLD_MS);
  }, [recipe?.id]);

  const isFilled = !!recipe;
  const isShowingActive = isSpinning && !lockedRef.current;
  const notchColor = NOTCH_COLORS[index];

  const windowContent = (() => {
    if (isFilled) {
      return (
        <Animated.View
          style={[reelStyles.logoWrap, { transform: [{ scale: lockAnim }] }]}
        >
          <Animated.View
            pointerEvents="none"
            style={[
              StyleSheet.absoluteFill,
              {
                backgroundColor: BRAND.orange,
                borderRadius: 10,
                opacity: glowAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, 0.22],
                }),
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
    if (isShowingActive && spinSymbol) {
      return (
        <View style={reelStyles.spinWindow}>
          <Text style={reelStyles.spinEmoji}>{spinSymbol}</Text>
        </View>
      );
    }
    return (
      <View style={reelStyles.idleWindow}>
        <Text style={reelStyles.idleQ}>?</Text>
      </View>
    );
  })();

  const frameStyle = [reelStyles.frame, isFilled && reelStyles.frameFilled];

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
      <TouchableOpacity
        onPress={onPress}
        activeOpacity={0.8}
        style={frameStyle}
      >
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
  column: {
    width: REEL_WIDTH,
    alignItems: "center",
  },
  frame: {
    width: REEL_WIDTH,
    height: REEL_HEIGHT,
    borderRadius: 16,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#f0ebe6",
    padding: 3,
    elevation: 2,
    shadowColor: "#1a1a1a",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    position: "relative",
  },
  frameFilled: {
    elevation: 5,
    shadowColor: BRAND.teal,
    shadowOpacity: 0.16,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    borderColor: "#f0ebe6",
  },
  notch: {
    position: "absolute",
    left: 0,
    top: 12,
    bottom: 12,
    width: 3,
    borderTopRightRadius: 2,
    borderBottomRightRadius: 2,
    zIndex: 2,
  },
  window: {
    flex: 1,
    borderRadius: 13,
    overflow: "hidden",
    backgroundColor: "#ffffff",
  },
  idleWindow: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#ffffff",
  },
  idleQ: {
    fontFamily: "RalewayBold",
    fontSize: 30,
    color: BRAND.teal,
    opacity: 0.35,
  },
  spinWindow: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#ffffff",
  },
  spinEmoji: {
    fontSize: 32,
    lineHeight: 38,
  },
  logoWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#ffffff",
    borderRadius: 13,
    overflow: "hidden",
  },
  lockedLogo: {
    width: REEL_HEIGHT * 0.62,
    height: REEL_HEIGHT * 0.62,
  },
  nameStrip: {
    fontFamily: "RalewayBold",
    fontSize: 10,
    color: BRAND.teal,
    marginTop: 6,
    textAlign: "center",
    letterSpacing: 0.1,
    lineHeight: 13,
    width: "100%",
    minHeight: 26,
  },
  namePlaceholder: {
    height: 32,
  },
});

// ── Main screen ───────────────────────────────────────────────────────────────

export default function SpinScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const [spinCount, setSpinCount] = useState(0);
  const [seenIds, setSeenIds] = useState([]);
  const [phase, setPhase] = useState("idle");
  const [slots, setSlots] = useState([null, null, null]);
  const [displayedCount, setDisplayedCount] = useState(0);
  const [errorMsg, setErrorMsg] = useState(null);
  const [resetModalVisible, setResetModalVisible] = useState(false);

  const pendingNav = useRef(null);

  const [copy, setCopy] = useState(() => ({
    idleHeadline: pick(IDLE_HEADLINES),
    idleSubline: pick(IDLE_SUBLINES),
    midHeadline: pick(MID_HEADLINES),
    midSubline: pick(MID_SUBLINES(MAX_SPINS - 1)),
    capHeadline: pick(CAP_HEADLINES),
    capCheek: pick(CAP_CHEEKS),
  }));

  const scaleAnim = useRef(new Animated.Value(1)).current;
  const spinAnim = useRef(new Animated.Value(0)).current;
  const currentRotation = useRef(0);

  // Entry animation
  useEffect(() => {
    const t = setTimeout(() => {
      const demoTarget = 2.4 * 360;
      Animated.timing(spinAnim, {
        toValue: demoTarget,
        duration: 1400,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();
      currentRotation.current = demoTarget;
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }, 400);
    return () => clearTimeout(t);
  }, []);

  // Restore session
  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => {
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
        } catch (_) {
          // Corrupt session — clear it so it doesn't persist
          AsyncStorage.removeItem(STORAGE_KEY).catch(() => {});
        }
      })
      .catch(() => {
        // AsyncStorage read failure — start fresh silently
      });
  }, []);

  const [fetchRecipe, { loading }] = useLazyQuery(RANDOM_RECIPE, {
    fetchPolicy: "no-cache",
  });

  const handleReelLocked = useCallback(() => {
    if (pendingNav.current) {
      const nav = pendingNav.current;
      pendingNav.current = null;
      navigation.navigate("Recipe", nav);
    }
  }, [navigation]);

  const doReset = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    AsyncStorage.removeItem(STORAGE_KEY).catch(() => {});
    pendingNav.current = null;
    setSpinCount(0);
    setSeenIds([]);
    setDisplayedCount(0);
    setSlots([null, null, null]);
    setPhase("idle");
    setErrorMsg(null);
    setResetModalVisible(false);
    setCopy({
      idleHeadline: pick(IDLE_HEADLINES),
      idleSubline: pick(IDLE_SUBLINES),
      midHeadline: pick(MID_HEADLINES),
      midSubline: pick(MID_SUBLINES(MAX_SPINS - 1)),
      capHeadline: pick(CAP_HEADLINES),
      capCheek: pick(CAP_CHEEKS),
    });
  }, []);

  const handleReset = useCallback(() => {
    // Always confirm — even at softCap, they might want to save a recipe first
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setResetModalVisible(true);
  }, []);

  const handleSpin = useCallback(() => {
    if (phase === "spinning" || loading) return;

    setErrorMsg(null);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setPhase("spinning");

    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 0.94,
        duration: 100,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 220,
        easing: Easing.out(Easing.back(2)),
        useNativeDriver: true,
      }),
    ]).start();

    const fetchPromise = fetchRecipe({ variables: { excludeIds: seenIds } });
    const extraSpins = 4 + Math.random();
    const targetDeg = currentRotation.current + extraSpins * 360;
    currentRotation.current = targetDeg;

    const animPromise = new Promise((resolve) => {
      Animated.timing(spinAnim, {
        toValue: targetDeg,
        duration: SPIN_DURATION,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start(resolve);
    });

    Promise.all([fetchPromise, animPromise])
      .then(([{ data, error }]) => {
        if (error) {
          setPhase(spinCount > 0 ? "revealed" : "idle");
          setErrorMsg(
            "Couldn't reach the server. Check your connection and try again.",
          );
          return;
        }
        const recipe = data?.randomRecipe;
        if (!recipe) {
          setPhase(spinCount > 0 ? "revealed" : "idle");
          setErrorMsg("No recipe came back — give it another spin.");
          return;
        }

        setErrorMsg(null);
        const nextCount = spinCount + 1;
        const nextSeen = [...seenIds, recipe.id];
        const nextSlots = slots.map((s, i) =>
          i === nextCount - 1 ? recipe : s,
        );
        const isCap = nextCount >= MAX_SPINS;

        setSeenIds(nextSeen);
        setSpinCount(nextCount);
        setDisplayedCount(nextCount);
        setSlots(nextSlots);
        setPhase(isCap ? "softCap" : "revealed");

        if (!isCap)
          setCopy((prev) => ({
            ...prev,
            midSubline: pick(MID_SUBLINES(MAX_SPINS - nextCount)),
          }));

        AsyncStorage.setItem(
          STORAGE_KEY,
          JSON.stringify({
            slots: nextSlots,
            spinCount: nextCount,
            seenIds: nextSeen,
          }),
        ).catch(() => {});

        pendingNav.current = {
          recipe,
          spinCount: nextCount,
          seenIds: nextSeen,
          isLast: false,
        };
      })
      .catch(() => {
        setPhase(spinCount > 0 ? "revealed" : "idle");
        setErrorMsg("Something went wrong. Give it another spin.");
      });
  }, [phase, loading, seenIds, spinCount, slots]);

  const spinRotate = spinAnim.interpolate({
    inputRange: [0, 360],
    outputRange: ["0deg", "360deg"],
  });

  const isSpinning = phase === "spinning";
  const isSoftCap = phase === "softCap";
  const hasSpun = displayedCount > 0;
  const headline = hasSpun && !isSoftCap ? copy.midHeadline : copy.idleHeadline;
  const subline = hasSpun && !isSoftCap ? copy.midSubline : copy.idleSubline;

  return (
    <View style={styles.root}>
      <StatusBar
        barStyle="dark-content"
        translucent
        backgroundColor="transparent"
      />

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
              style={[
                styles.spinnerImg,
                {
                  width: SPINNER_SIZE,
                  height: SPINNER_SIZE,
                  top: (LOGO_SIZE - SPINNER_SIZE) / 1.4,
                  left: (LOGO_SIZE - SPINNER_SIZE) / 2,
                  transform: [{ rotate: spinRotate }],
                },
              ]}
              resizeMode="contain"
            />
            <Image
              source={require("../../assets/outer.png")}
              style={{ width: LOGO_SIZE, height: LOGO_SIZE }}
              resizeMode="contain"
            />
          </View>
        </View>

        {/* ── Messaging — fixed height, error state lives here ── */}
        <View style={styles.messaging}>
          {errorMsg ? (
            <Text style={styles.errorText} numberOfLines={2}>
              {errorMsg}
            </Text>
          ) : (
            <>
              <Text style={styles.headline} numberOfLines={1}>
                {isSoftCap ? copy.capHeadline : headline}
              </Text>
              <Text style={styles.subline} numberOfLines={2}>
                {isSoftCap ? copy.capCheek : subline}
              </Text>
            </>
          )}
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
                isActiveReel={isSpinning && i === spinCount} // ← add this
                onLocked={handleReelLocked}
                onPress={() =>
                  recipe &&
                  navigation.navigate("Recipe", {
                    recipe,
                    spinCount,
                    seenIds,
                    isLast: false,
                  })
                }
              />
            ))}
          </View>
        </View>

        {/* ── CTA slot ── */}
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
            <Animated.View
              style={[styles.ctaWrap, { transform: [{ scale: scaleAnim }] }]}
            >
              <TonightButton
                icon="dice-multiple"
                title={hasSpun ? "Spin again" : "Spin"}
                subtitle={
                  isSpinning
                    ? "The wheel decides…"
                    : hasSpun
                      ? "Get another random recipe"
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
          Powered by Savor
        </Text>
      </View>

      {/* ── Confirm reset modal ── */}
      <ConfirmResetModal
        visible={resetModalVisible}
        onConfirm={doReset}
        onCancel={() => setResetModalVisible(false)}
        hasRecipes={hasSpun}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.offWhite,
  },
  body: {
    flex: 1,
    alignItems: "center",
    paddingHorizontal: 16,
  },

  wordmarkSlot: {
    paddingTop: 28,
    paddingBottom: 24,
    alignItems: "center",
  },

  wheelSlot: {
    width: LOGO_SIZE,
    height: LOGO_SIZE,
    alignItems: "center",
    justifyContent: "center",
  },
  wheelShadow: {
    width: LOGO_SIZE,
    height: LOGO_SIZE,
    position: "relative",
    elevation: 12,
    shadowColor: "#142829",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.16,
    shadowRadius: 18,
  },
  spinnerImg: { position: "absolute" },

  // Fixed height — error msg or headline/subline, no reflow
  messaging: {
    height: 68,
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 8,
    marginTop: 12,
    marginBottom: 4,
  },
  headline: {
    fontFamily: "RalewayBold",
    fontSize: 22,
    lineHeight: 28,
    color: "#142829",
    textAlign: "center",
  },
  subline: {
    fontFamily: "Raleway",
    fontSize: 14,
    lineHeight: 18,
    color: "#142829",
    opacity: 0.55,
    textAlign: "center",
    marginTop: 4,
  },
  errorText: {
    fontFamily: "RalewayBold",
    fontSize: 14,
    lineHeight: 20,
    color: "#c0392b",
    textAlign: "center",
    opacity: 0.85,
  },

  reelsMachine: {
    width: "100%",
    marginTop: 8,
    marginBottom: 20,
  },
  reelsRow: {
    flexDirection: "row",
    gap: REEL_GAP,
    position: "relative",
    justifyContent: "center",
  },
  winLine: {
    position: "absolute",
    left: -4,
    right: -4,
    top: REEL_HEIGHT / 2 - 0.5,
    height: 1,
    backgroundColor: "#FF9800",
    opacity: 0.28,
    zIndex: 0,
    pointerEvents: "none",
  },

  ctaSlot: {
    width: "100%",
    height: 96,
    justifyContent: "center",
    alignItems: "center",
    marginTop: "auto",
  },
  ctaWrap: {
    width: "100%",
  },
  resetBtn: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 14,
  },
  resetLabel: {
    fontFamily: "RalewayBold",
    fontSize: 15,
    color: "#142829",
    letterSpacing: 0.2,
  },

  footer: {
    fontFamily: "Raleway",
    fontSize: 11,
    color: "#142829",
    opacity: 0.4,
    marginTop: 6,
    letterSpacing: 0.4,
    textAlign: "center",
  },
});

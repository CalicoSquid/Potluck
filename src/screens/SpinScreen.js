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
import { useFocusEffect } from "@react-navigation/native";

import { colors } from "../constants/colors";
import TonightButton from "../components/TonightButton";
import PotluckHeader from "../components/PotluckHeader";
import ComicBackground from "../components/ComicBackground";
import SlotReel from "../components/SlotReel";
import ConfirmResetModal from "../components/ConfirmResetModal";

import {
  pick,
  IDLE_HEADLINES, IDLE_SUBLINES,
  MID_HEADLINES,  MID_SUBLINES,
  CAP_HEADLINES,  CAP_CHEEKS,
} from "../copy/spinCopy";

// ── Constants ─────────────────────────────────────────────────────────────────

const { width: SCREEN_WIDTH } = Dimensions.get("window");

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
        cook  { hours minutes }
        prep  { hours minutes }
        total { hours minutes }
      }
    }
  }
`;

// ── Main screen ───────────────────────────────────────────────────────────────

export default function SpinScreen({ navigation }) {
  const insets = useSafeAreaInsets();

  // ── State ──────────────────────────────────────────────────────────────────
  const [spinCount,         setSpinCount]         = useState(0);
  const [seenIds,           setSeenIds]           = useState([]);
  const [phase,             setPhase]             = useState("idle");
  const [slots,             setSlots]             = useState([null, null, null]);
  const [displayedCount,    setDisplayedCount]    = useState(0);
  const [errorMsg,          setErrorMsg]          = useState(null);
  const [resetModalVisible, setResetModalVisible] = useState(false);
  const [headerHeight,      setHeaderHeight]      = useState(0);

  const [copy, setCopy] = useState(() => ({
    idleHeadline: pick(IDLE_HEADLINES),
    idleSubline:  pick(IDLE_SUBLINES),
    midHeadline:  pick(MID_HEADLINES),
    midSubline:   pick(MID_SUBLINES(MAX_SPINS - 1)),
    capHeadline:  pick(CAP_HEADLINES),
    capCheek:     pick(CAP_CHEEKS),
  }));

  // ── Refs ───────────────────────────────────────────────────────────────────
  const spinCountRef    = useRef(0);
  const pendingNav      = useRef(null);
  const currentRotation = useRef(0);

  const scaleAnim   = useRef(new Animated.Value(1)).current;
  const spinAnim    = useRef(new Animated.Value(0)).current;
  const raysOpacity = useRef(new Animated.Value(0)).current;

  // ── Entry animation ────────────────────────────────────────────────────────
  useEffect(() => {
    const t = setTimeout(() => {
      const demoTarget = 2.4 * 360;
      Animated.timing(spinAnim, {
        toValue: demoTarget, duration: 1400,
        easing: Easing.out(Easing.cubic), useNativeDriver: true,
      }).start();
      currentRotation.current = demoTarget;
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }, 400);
    return () => clearTimeout(t);
  }, []);

  // ── Session restore ────────────────────────────────────────────────────────
  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => {
        if (!raw) return;
        try {
          const session = JSON.parse(raw);
          if (session.slots && session.spinCount > 0) {
            setSlots(session.slots);
            setSpinCount(session.spinCount);
            spinCountRef.current = session.spinCount;
            setDisplayedCount(session.spinCount);
            setSeenIds(session.seenIds || []);
            setPhase(session.spinCount >= MAX_SPINS ? "softCap" : "revealed");
          }
        } catch (_) {
          AsyncStorage.removeItem(STORAGE_KEY).catch(() => {});
        }
      })
      .catch(() => {});
  }, []);

  // ── Apollo ─────────────────────────────────────────────────────────────────
  const [fetchRecipe, { loading }] = useLazyQuery(RANDOM_RECIPE, {
    fetchPolicy: "no-cache",
  });

  // ── Handlers ───────────────────────────────────────────────────────────────
  const handleReelLocked = useCallback(() => {
    if (pendingNav.current) {
      const nav = pendingNav.current;
      pendingNav.current = null;
      navigation.navigate("Recipe", nav);
    }
  }, [navigation]);

  // Deferred copy + rays fade-out on focus return (avoids pre-nav flicker)
  useFocusEffect(
    useCallback(() => {
      const count = spinCountRef.current;
      if (count > 0 && count < MAX_SPINS) {
        setCopy((prev) => ({
          ...prev,
          midSubline: pick(MID_SUBLINES(MAX_SPINS - count)),
        }));
      }
      Animated.timing(raysOpacity, {
        toValue: 0, duration: 400,
        easing: Easing.in(Easing.quad), useNativeDriver: true,
      }).start();
    }, []),
  );

  const doReset = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    AsyncStorage.removeItem(STORAGE_KEY).catch(() => {});
    pendingNav.current   = null;
    spinCountRef.current = 0;
    raysOpacity.setValue(0);
    setSpinCount(0);
    setSeenIds([]);
    setDisplayedCount(0);
    setSlots([null, null, null]);
    setPhase("idle");
    setErrorMsg(null);
    setResetModalVisible(false);
    setCopy({
      idleHeadline: pick(IDLE_HEADLINES),
      idleSubline:  pick(IDLE_SUBLINES),
      midHeadline:  pick(MID_HEADLINES),
      midSubline:   pick(MID_SUBLINES(MAX_SPINS - 1)),
      capHeadline:  pick(CAP_HEADLINES),
      capCheek:     pick(CAP_CHEEKS),
    });
  }, []);

  const handleReset = useCallback(() => {
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
        toValue: 0.94, duration: 100,
        easing: Easing.out(Easing.quad), useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1, duration: 220,
        easing: Easing.out(Easing.back(2)), useNativeDriver: true,
      }),
    ]).start();

    const fetchPromise = fetchRecipe({ variables: { excludeIds: seenIds } });
    const targetDeg    = currentRotation.current + (4 + Math.random()) * 360;
    currentRotation.current = targetDeg;

    const animPromise = new Promise((resolve) => {
      Animated.timing(spinAnim, {
        toValue: targetDeg, duration: SPIN_DURATION,
        easing: Easing.out(Easing.cubic), useNativeDriver: true,
      }).start(resolve);
    });

    Promise.all([fetchPromise, animPromise])
      .then(([{ data, error }]) => {
        if (error) {
          setPhase(spinCount > 0 ? "revealed" : "idle");
          setErrorMsg("Couldn't reach the server. Check your connection and try again.");
          return;
        }
        const recipe = data?.randomRecipe;
        if (!recipe) {
          setPhase(spinCount > 0 ? "revealed" : "idle");
          setErrorMsg("No recipe came back — give it another spin.");
          return;
        }

        const nextCount = spinCount + 1;
        const nextSeen  = [...seenIds, recipe.id];
        const nextSlots = slots.map((s, i) => i === nextCount - 1 ? recipe : s);
        const isCap     = nextCount >= MAX_SPINS;

        setErrorMsg(null);
        setSeenIds(nextSeen);
        setSpinCount(nextCount);
        spinCountRef.current = nextCount;
        setDisplayedCount(nextCount);
        setSlots(nextSlots);
        setPhase(isCap ? "softCap" : "revealed");

        // Rays fade in as spin reward; fade out deferred to useFocusEffect on return
        Animated.timing(raysOpacity, {
          toValue: 1, duration: 600,
          easing: Easing.out(Easing.quad), useNativeDriver: true,
        }).start();

        // midSubline intentionally NOT updated here — avoids pre-nav copy flicker
        AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({
          slots: nextSlots, spinCount: nextCount, seenIds: nextSeen,
        })).catch(() => {});

        pendingNav.current = { recipe, spinCount: nextCount, seenIds: nextSeen, isLast: false };
      })
      .catch(() => {
        setPhase(spinCount > 0 ? "revealed" : "idle");
        setErrorMsg("Something went wrong. Give it another spin.");
      });
  }, [phase, loading, seenIds, spinCount, slots]);

  // ── Derived ────────────────────────────────────────────────────────────────
  const spinRotate = spinAnim.interpolate({ inputRange: [0, 360], outputRange: ["0deg", "360deg"] });
  const isSpinning = phase === "spinning";
  const isSoftCap  = phase === "softCap";
  const hasSpun    = displayedCount > 0;
  const headline   = hasSpun && !isSoftCap ? copy.midHeadline : copy.idleHeadline;
  const subline    = hasSpun && !isSoftCap ? copy.midSubline  : copy.idleSubline;

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" translucent backgroundColor="transparent" />

      {headerHeight > 0 && <ComicBackground headerHeight={headerHeight} />}

      <PotluckHeader
        spinCount={displayedCount}
        onLayout={(e) => setHeaderHeight(e.nativeEvent.layout.height)}
      />

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
              source={require("../../assets/rays.png")}
              style={[styles.raysImg, { opacity: raysOpacity }]}
              resizeMode="contain"
            />
            <Animated.Image
              source={require("../../assets/spinner.png")}
              style={[styles.spinnerImg, {
                width: SPINNER_SIZE, height: SPINNER_SIZE,
                top:  (LOGO_SIZE - SPINNER_SIZE) / 1.4,
                left: (LOGO_SIZE - SPINNER_SIZE) / 2,
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

        {/* ── Messaging ── */}
        <View style={styles.messaging}>
          {errorMsg ? (
            <Text style={styles.errorText} numberOfLines={2}>{errorMsg}</Text>
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

        {/* ── Slot reels ── */}
        <View style={styles.reelsMachine}>
          <View style={styles.reelsRow}>
            <View style={styles.winLine} />
            {slots.map((recipe, i) => (
              <SlotReel
                key={i}
                index={i}
                recipe={recipe}
                reelWidth={REEL_WIDTH}
                isSpinning={isSpinning}
                isActiveReel={isSpinning && i === spinCount}
                onLocked={handleReelLocked}
                onPress={() =>
                  recipe && navigation.navigate("Recipe", { recipe, spinCount, seenIds, isLast: false })
                }
              />
            ))}
          </View>
        </View>

        {/* ── CTA ── */}
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
                  : hasSpun  ? "Get another random recipe"
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

      <ConfirmResetModal
        visible={resetModalVisible}
        onConfirm={doReset}
        onCancel={() => setResetModalVisible(false)}
      />
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: {
    flex:            1,
    backgroundColor: colors.offWhite,
    overflow:        "hidden",
  },
  body: {
    flex:              1,
    alignItems:        "center",
    paddingHorizontal: 16,
  },
  wordmarkSlot: {
    paddingTop:    28,
    paddingBottom: 24,
    alignItems:    "center",
  },
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
    overflow:      "visible",
  },
  spinnerImg: { position: "absolute" },
  raysImg: {
    position: "absolute",
    width:    LOGO_SIZE * 1.1,
    height:   LOGO_SIZE * 1.1,
    top:      -(LOGO_SIZE * 0.05),
    left:     -(LOGO_SIZE * 0.05),
  },
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
  errorText: {
    fontFamily: "RalewayBold",
    fontSize:   14,
    lineHeight: 20,
    color:      "#c0392b",
    textAlign:  "center",
    opacity:    0.85,
  },
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
  ctaSlot: {
    width:          "100%",
    height:         96,
    justifyContent: "center",
    alignItems:     "center",
    marginTop:      "auto",
  },
  ctaWrap:  { width: "100%" },
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
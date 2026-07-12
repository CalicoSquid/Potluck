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
  Pressable,
  Dimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Icon } from "react-native-paper";
import { useLazyQuery } from "@apollo/client/react";
import * as Haptics from "expo-haptics";

import { colors, tealAlpha, TEAL_GRADIENT, TEAL_SHADOW } from "../constants/colors";
import { getTodaysReading } from "../lib/readings";
import { hasOnboarded, setOnboarded } from "../lib/onboarding";
import { totalMins, fmtMins, daypartNow } from "../lib/time";
import { decodeRecipe } from "../lib/recipe";
import {
  pick,
  verdictFor,
  IDLE_HEADLINES,
  IDLE_SUBLINES,
  REVEAL_SUBLINES,
  REROLL_LABELS,
} from "../lib/spinCopy";
import { RANDOM_RECIPE } from "../apollo/queries";
import PotluckButton from "../components/PotluckButton";
import PotluckHeader from "../components/PotluckHeader";
import ComicBackground from "../components/ComicBackground";
import Centerpiece from "../components/Centerpiece";
import TypewriterVerdict from "../components/TypewriterVerdict";
import OnboardingSheet from "../components/OnboardingSheet";

// ── Layout ────────────────────────────────────────────────────────────────────
const { width: SCREEN_WIDTH } = Dimensions.get("window");

const WORDMARK_WIDTH = SCREEN_WIDTH * 0.94;
const WORDMARK_ASPECT = 1500 / 550;
const WORDMARK_HEIGHT = WORDMARK_WIDTH / WORDMARK_ASPECT;

const CENTER_SIZE = SCREEN_WIDTH * 0.64;
const SPIN_DURATION = 1800;

// ── Screen ──────────────────────────────────────────────────────────────────--
export default function SpinScreen({ navigation }) {
  const insets = useSafeAreaInsets();

  const [phase, setPhase] = useState("idle"); // idle | spinning | revealed
  const [recipe, setRecipe] = useState(null);
  const [committedId, setCommittedId] = useState(null); // id of today's locked-in pick, if we opened into one
  const [hadPickOnOpen, setHadPickOnOpen] = useState(false); // drives the header's one-shot pulse
  const [booting, setBooting] = useState(true); // gates first paint until the pick read resolves
  const [showOnboarding, setShowOnboarding] = useState(false); // first-run intro, shown once
  const [sessionSpins, setSessionSpins] = useState(0);
  const [seenIds, setSeenIds] = useState([]);
  const [errorMsg, setErrorMsg] = useState(null);
  const [headerHeight, setHeaderHeight] = useState(0);
  const [revealSub, setRevealSub] = useState(() => pick(REVEAL_SUBLINES));
  const [copy] = useState(() => ({
    idleHeadline: pick(IDLE_HEADLINES),
    idleSubline: pick(IDLE_SUBLINES),
  }));

  const scaleAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    let cancelled = false;
    getTodaysReading()
      .then((entry) => {
        // Only a *committed* pick resurfaces — reopen straight onto tonight's
        // locked-in dish. An uncommitted spin was never stored, so a fresh
        // session gets a fresh wheel. Fate is a moment; commitment is what lasts.
        if (cancelled || !entry?.committed || !entry?.recipe?.id) return;
        const r = entry.recipe;
        setRecipe(r);
        setSeenIds([r.id]);
        setCommittedId(r.id);
        setHadPickOnOpen(true);
        setRevealSub(verdictFor(r));
        setPhase("revealed");
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setBooting(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // First open ever → the universe introduces itself, once. Checked separately
  // from the reading read so a storage hiccup on one never blocks the other.
  useEffect(() => {
    let cancelled = false;
    hasOnboarded()
      .then((done) => {
        if (!cancelled && !done) setShowOnboarding(true);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const dismissOnboarding = useCallback(() => {
    setShowOnboarding(false);
    setOnboarded();
  }, []);

  const [fetchRecipe, { loading }] = useLazyQuery(RANDOM_RECIPE, {
    fetchPolicy: "no-cache",
  });

  const handleSpin = useCallback(() => {
    if (phase === "spinning" || loading) return;

    setErrorMsg(null);
    setSessionSpins((n) => n + 1);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
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

    const fetchPromise = fetchRecipe({
      variables: { excludeIds: seenIds, daypart: daypartNow() },
    }).then((res) => {
      const img = res?.data?.randomRecipe?.image;
      if (img) Image.prefetch(img).catch(() => {});
      return res;
    });

    const minSpin = new Promise((r) => setTimeout(r, SPIN_DURATION));

    const recover = (msg) => {
      setPhase(recipe ? "revealed" : "idle");
      setErrorMsg(msg);
    };

    Promise.all([fetchPromise, minSpin])
      .then(([{ data, error }]) => {
        if (error)
          return recover(
            "Couldn't reach the server. Check your connection and try again.",
          );
        const picked = decodeRecipe(data?.randomRecipe);
        if (!picked) return recover("The universe drew a blank — spin again.");

        setRecipe(picked);
        setSeenIds((prev) => [...prev, picked.id]);
        setRevealSub(verdictFor(picked));
        setPhase("revealed");
        // A spin is ephemeral — nothing is stored until you lock it in on the
        // recipe screen. A fresh spin never carries the "locked in" badge.
      })
      .catch(() => recover("Something went wrong. Give it another spin."));
  }, [phase, loading, seenIds, recipe]);

  const handleSeeRecipe = useCallback(() => {
    if (recipe) navigation.navigate("Recipe", { recipe });
  }, [recipe, navigation]);

  const isSpinning = phase === "spinning";
  const isRevealed = phase === "revealed" && !!recipe;
  const rerollLabel =
    REROLL_LABELS[
      Math.min(Math.max(sessionSpins - 1, 0), REROLL_LABELS.length - 1)
    ];

  const mins = isRevealed ? totalMins(recipe) : 0;
  const timeStr = mins ? fmtMins(mins) : null;
  const yieldStr = isRevealed ? recipe.recipeYield : null;

  return (
    <View style={styles.root}>
      <StatusBar
        barStyle="dark-content"
        translucent
        backgroundColor="transparent"
      />

      {headerHeight > 0 && <ComicBackground headerHeight={headerHeight} />}

      <PotluckHeader
        spinning={isSpinning}
        hasReading={hadPickOnOpen}
        onLayout={(e) => setHeaderHeight(e.nativeEvent.layout.height)}
      />

      <View style={styles.body}>
        <View style={styles.wordmarkSlot}>
          <Image
            source={require("../../assets/potluck_wordmark.webp")}
            style={{ width: WORDMARK_WIDTH, height: WORDMARK_HEIGHT }}
            resizeMode="contain"
          />
        </View>

        <View style={styles.hero}>
          {!booting && (
            <Pressable
              onPress={isRevealed ? handleSeeRecipe : handleSpin}
              disabled={isSpinning || loading}
              style={({ pressed }) => [
                styles.wheelTap,
                pressed && !isSpinning && { transform: [{ scale: 0.97 }] },
              ]}
            >
              <Centerpiece
                phase={phase}
                recipe={recipe}
                size={CENTER_SIZE}
                badge={
                  isRevealed && recipe?.id === committedId
                    ? "LOCKED IN"
                    : null
                }
              />
            </Pressable>
          )}

          <View style={styles.content}>
            {booting ? null : isRevealed ? (
              <>
                <TypewriterVerdict text={revealSub} />
                {(timeStr || yieldStr) && (
                  <View style={styles.metaRow}>
                    {timeStr && (
                      <Text style={styles.metaText}>⏱ {timeStr}</Text>
                    )}
                    {timeStr && yieldStr ? (
                      <View style={styles.metaDot} />
                    ) : null}
                    {yieldStr && (
                      <Text style={styles.metaText} numberOfLines={1}>
                        🍽 {yieldStr}
                      </Text>
                    )}
                  </View>
                )}
                {/* A failed reroll keeps the current dish on screen — surface
                    the error *below* the verdict so it reads as "that spin
                    didn't take", not "this dish is broken". */}
                {errorMsg ? (
                  <Text style={styles.errorLine} numberOfLines={2}>
                    {errorMsg}
                  </Text>
                ) : null}
              </>
            ) : isSpinning ? (
              <Text style={styles.headline}>The universe is deciding…</Text>
            ) : errorMsg ? (
              <Text style={styles.errorText} numberOfLines={2}>
                {errorMsg}
              </Text>
            ) : (
              <>
                <Text style={styles.headline}>{copy.idleHeadline}</Text>
                <Text style={styles.subline}>{copy.idleSubline}</Text>
              </>
            )}
          </View>
        </View>
        <View
          style={[
            styles.actions,
            { paddingBottom: Math.max(insets.bottom, 16) },
          ]}
        >
          {booting ? null : isRevealed ? (
            <>
              <PotluckButton
                icon="silverware-fork-knife"
                title="See the recipe"
                subtitle="Ingredients, steps, the lot"
                gradientColors={TEAL_GRADIENT}
                shadowColor={TEAL_SHADOW}
                onPress={handleSeeRecipe}
              />
              <TouchableOpacity
                onPress={handleSpin}
                style={styles.rerollBtn}
                activeOpacity={0.7}
                disabled={isSpinning || loading}
                hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
              >
                <Icon source="refresh" size={18} color={colors.teal} />
                <Text style={styles.rerollBtnLabel} numberOfLines={2}>
                  {rerollLabel}
                </Text>
              </TouchableOpacity>
            </>
          ) : (
            <Animated.View
              style={[styles.ctaWrap, { transform: [{ scale: scaleAnim }] }]}
            >
              <PotluckButton
                icon="dice-multiple"
                title="Spin"
                subtitle={
                  isSpinning
                    ? "The wheel decides…"
                    : "Let the universe pick dinner"
                }
                gradientColors={TEAL_GRADIENT}
                shadowColor={TEAL_SHADOW}
                onPress={handleSpin}
                loading={isSpinning}
              />
            </Animated.View>
          )}
        </View>
      </View>

      {!booting && (
        <OnboardingSheet
          visible={showOnboarding}
          onClose={dismissOnboarding}
        />
      )}
    </View>
  );
}

// ── Styles ──────────────────────────────────────────────────────────────────--
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.offWhite, overflow: "hidden" },
  body: { flex: 1, alignItems: "center", paddingHorizontal: 16 },

  wordmarkSlot: { paddingTop: 14, paddingBottom: 4, alignItems: "center" },

  hero: {
    flex: 1,
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
  },

  content: {
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 12,
    marginTop: 22,
    minHeight: 56,
  },
  headline: {
    fontFamily: "RalewayBold",
    fontSize: 22,
    lineHeight: 28,
    color: colors.teal,
    textAlign: "center",
  },
  subline: {
    fontFamily: "Raleway",
    fontSize: 14,
    lineHeight: 18,
    color: colors.teal,
    opacity: 0.55,
    textAlign: "center",
    marginTop: 4,
  },
  errorText: {
    fontFamily: "RalewayBold",
    fontSize: 14,
    lineHeight: 20,
    color: colors.error,
    textAlign: "center",
    opacity: 0.9,
  },
  errorLine: {
    fontFamily: "RalewaySemiBold",
    fontSize: 12,
    lineHeight: 16,
    color: colors.error,
    textAlign: "center",
    opacity: 0.8,
    marginTop: 8,
  },

  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
  },
  metaText: {
    fontFamily: "RalewaySemiBold",
    fontSize: 13,
    color: colors.teal,
    opacity: 0.6,
  },
  metaDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: colors.teal,
    opacity: 0.35,
    marginHorizontal: 10,
  },

  actions: { width: "100%" },
  ctaWrap: { width: "100%" },

  wheelTap: { alignItems: "center", justifyContent: "center" },

  rerollBtn: {
    marginTop: 12,
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 15,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: tealAlpha(0.22),
    backgroundColor: tealAlpha(0.03),
  },
  rerollBtnLabel: {
    fontFamily: "RalewaySemiBold",
    fontSize: 14,
    color: colors.teal,
    opacity: 0.85,
    textAlign: "center",
    flexShrink: 1,
  },
});
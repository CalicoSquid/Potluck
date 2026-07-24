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

import {
  colors,
  tealAlpha,
  TEAL_GRADIENT,
  TEAL_SHADOW,
} from "../constants/colors";
import { getTodaysReading, clearTodaysPick } from "../lib/readings";
import { hasOnboarded, setOnboarded } from "../lib/onboarding";
import { banRecipe, unbanRecipe, getBannedSet } from "../lib/banStore";
import { banReactionFor, banishedAllLine } from "../lib/banReactions";
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
import BanNotice from "../components/BanNotice";

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
  const [bannedIds, setBannedIds] = useState([]); // recipe ids sent to the void
  const [toast, setToast] = useState(null); // temporary in-place 86 reaction
  const [copy] = useState(() => ({
    idleHeadline: pick(IDLE_HEADLINES),
    idleSubline: pick(IDLE_SUBLINES),
  }));

  const scaleAnim = useRef(new Animated.Value(1)).current;
  const spinSeq = useRef(0); // invalidates in-flight spins superseded by a newer action
  const toastSeq = useRef(0);
  const pendingBanOps = useRef(new Map()); // closes the tiny ban/undo persistence race

  useEffect(() => {
    let cancelled = false;
    (async () => {
      // Load the void first: a banned committed pick must never resurface, and
      // the first spin should already exclude everything you've 86'd.
      const banned = await getBannedSet();
      if (cancelled) return;
      setBannedIds([...banned]);

      const entry = await getTodaysReading();
      if (cancelled) return;
      // Only a *committed*, un-banned pick resurfaces — reopen straight onto
      // tonight's locked-in dish. Fate is a moment; commitment is what lasts.
      if (
        entry?.committed &&
        entry?.recipe?.id &&
        !banned.has(entry.recipe.id)
      ) {
        const r = entry.recipe;
        setRecipe(r);
        setSeenIds([r.id]);
        setCommittedId(r.id);
        setHadPickOnOpen(true);
        setRevealSub(verdictFor(r));
        setPhase("revealed");
      }
    })()
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

  // The shared spin engine. `extraExclude` lets a 86 drop the just-banned dish in
  // the same breath it spins a replacement; `keepCurrentOnFail` decides whether a
  // failed fetch falls back onto the current dish (a reroll) or to idle (a 86,
  // where the current dish is the one we just cast out).
  const runSpin = useCallback(
    ({ extraExclude = [], keepCurrentOnFail = true } = {}) => {
      if (phase === "spinning" || loading) return;

      const seq = ++spinSeq.current;
      setErrorMsg(null);
      setSessionSpins((n) => n + 1);
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

      const excludeIds = [...seenIds, ...bannedIds, ...extraExclude];

      const fetchPromise = fetchRecipe({
        variables: { excludeIds, daypart: daypartNow() },
      }).then((res) => {
        const img = res?.data?.randomRecipe?.image;
        if (img) Image.prefetch(img).catch(() => {});
        return res;
      });

      const minSpin = new Promise((r) => setTimeout(r, SPIN_DURATION));

      const recover = (msg) => {
        if (seq !== spinSeq.current) return;
        setPhase(keepCurrentOnFail && recipe ? "revealed" : "idle");
        setErrorMsg(msg);
      };

      Promise.all([fetchPromise, minSpin])
        .then(([{ data, error }]) => {
          if (seq !== spinSeq.current) return; // superseded (e.g. an Undo landed)
          if (error)
            return recover(
              "Couldn't reach the server. Check your connection and try again.",
            );
          const picked = decodeRecipe(data?.randomRecipe);
          if (!picked)
            return recover(
              bannedIds.length || extraExclude.length
                ? banishedAllLine()
                : "The universe drew a blank — spin again.",
            );

          setRecipe(picked);
          setSeenIds((prev) => [...prev, picked.id]);
          setRevealSub(verdictFor(picked));
          setPhase("revealed");
        })
        .catch(() => recover("Something went wrong. Give it another spin."));
    },
    [phase, loading, seenIds, bannedIds, recipe, scaleAnim, fetchRecipe],
  );

  const handleSpin = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    runSpin();
  }, [runSpin]);

  // 86 the current dish — overruling the universe. The UI updates
  // optimistically so the reaction appears in the same beat as the replacement
  // spin. Persistence is reconciled in the background.
  const handle86 = useCallback(() => {
    if (!recipe || phase === "spinning" || loading) return;
    const victim = recipe;
    const toastId = `${Date.now()}-${++toastSeq.current}`;
    const predictedCount = new Set([...bannedIds, victim.id]).size;

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(
      () => {},
    );

    pendingBanOps.current.set(victim.id, {
      toastId,
      undone: false,
    });

    setBannedIds((prev) =>
      prev.includes(victim.id) ? prev : [...prev, victim.id],
    );
    setToast({
      id: toastId,
      message: banReactionFor(predictedCount),
      count: predictedCount,
      victim,
    });

    banRecipe(victim.id)
      .then((actualCount) => {
        const op = pendingBanOps.current.get(victim.id);
        if (!op || op.toastId !== toastId) return;

        // Undo may land while AsyncStorage is still writing the ban. Re-run the
        // forgiveness after the write settles so the final persisted state wins.
        if (op.undone) {
          return unbanRecipe(victim.id)
            .catch(() => {})
            .finally(() => pendingBanOps.current.delete(victim.id));
        }

        pendingBanOps.current.delete(victim.id);
        setToast((current) =>
          current?.id === toastId
            ? {
                ...current,
                count: actualCount,
                message:
                  actualCount === predictedCount
                    ? current.message
                    : banReactionFor(actualCount),
              }
            : current,
        );
      })
      .catch(() => {
        const op = pendingBanOps.current.get(victim.id);
        if (!op || op.toastId !== toastId) return;

        pendingBanOps.current.delete(victim.id);
        if (op.undone) return;

        setBannedIds((prev) => prev.filter((id) => id !== victim.id));
        setToast((current) =>
          current?.id === toastId
            ? {
                ...current,
                message: "The void rejected the paperwork. It may return.",
              }
            : current,
        );
      });

    // If we just 86'd tonight's locked-in dish, un-commit it too.
    if (victim.id === committedId) {
      clearTodaysPick();
      setCommittedId(null);
    }

    setRecipe(null); // a failed post-86 spin must fall to idle, not the banished dish
    runSpin({ extraExclude: [victim.id], keepCurrentOnFail: false });
  }, [recipe, phase, loading, committedId, bannedIds, runSpin]);

  // Undo from the receipt: forgive the dish and bring it straight back on screen.
  // The victim is passed directly so this callback stays stable while the screen
  // rerenders through the replacement spin.
  const handleUndo = useCallback((victim) => {
    if (!victim?.id) return;
    spinSeq.current++;

    const pending = pendingBanOps.current.get(victim.id);
    if (pending) pending.undone = true;

    unbanRecipe(victim.id).catch(() => {});
    setBannedIds((prev) => prev.filter((id) => id !== victim.id));

    setErrorMsg(null);
    setRecipe(victim);
    setSeenIds((prev) =>
      prev.includes(victim.id) ? prev : [...prev, victim.id],
    );
    setRevealSub(verdictFor(victim));
    setPhase("revealed");
  }, []);

  const dismissToast = useCallback((toastId) => {
    setToast((current) => (current?.id === toastId ? null : current));
  }, []);

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
                  isRevealed && recipe?.id === committedId ? "LOCKED IN" : null
                }
              />
            </Pressable>
          )}

          <View style={styles.content}>
            {toast ? (
              <BanNotice
                toast={toast}
                onUndo={handleUndo}
                onDismiss={dismissToast}
              />
            ) : booting ? null : isRevealed ? (
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
              <View style={styles.secondaryRow}>
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
                <TouchableOpacity
                  onPress={handle86}
                  style={styles.banBtn}
                  activeOpacity={0.7}
                  disabled={isSpinning || loading}
                  hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                  accessibilityLabel="86 this recipe — banish it from the wheel"
                >
                  <Text style={styles.banBtnLabel}>86</Text>
                </TouchableOpacity>
              </View>
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
        <OnboardingSheet visible={showOnboarding} onClose={dismissOnboarding} />
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
    height: 112,
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

  secondaryRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 12,
    width: "100%",
  },
  rerollBtn: {
    flex: 1,
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
  banBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 15,
    paddingHorizontal: 18,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: colors.primary + "40",
    backgroundColor: colors.primary + "0D",
  },
  banBtnLabel: {
    fontFamily: "RalewaySemiBold",
    fontSize: 14,
    color: colors.primary,
  },
});

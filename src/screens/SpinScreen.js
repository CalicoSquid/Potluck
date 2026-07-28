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
import { useFocusEffect } from "@react-navigation/native";
import { Icon } from "react-native-paper";
import { useLazyQuery } from "@apollo/client/react";
import * as Haptics from "expo-haptics";

import {
  colors,
  tealAlpha,
  TEAL_GRADIENT,
  TEAL_SHADOW,
  VOID_GRADIENT,
} from "../constants/colors";
import { getTodaysReading } from "../lib/readings";
import { hasOnboarded, setOnboarded } from "../lib/onboarding";
import {
  banRecipe,
  unbanRecipe,
  getBannedSet,
  hasBanishedBefore,
  markBanishedBefore,
  getBanTally,
  setBanTally,
} from "../lib/banStore";
import { banReactionFor, banishedAllLine, FIRST_BANISH } from "../lib/banReactions";
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

// The dock's inner height, reserved for every state so the reel above it never
// moves. Tallest state is the revealed one:
//   PotluckButton  8 + 16 + 46 + 16 + 8 = 94  (marginVertical + padding + badge)
//   secondaryRow  12 + 15 + 18 + 15     = 60  (marginTop + padding + label)
// If the dock ever gains or loses a row, this is the number to change.
const DOCK_CONTENT_HEIGHT = 154;

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
  const [hasBanished, setHasBanished] = useState(false); // picks first-run copy
  const [banishing, setBanishing] = useState(false); // the 86 moment (dish struck out)
  const [banishMsg, setBanishMsg] = useState(null); // void-coded line, under the reel
  const [copy] = useState(() => ({
    idleHeadline: pick(IDLE_HEADLINES),
    idleSubline: pick(IDLE_SUBLINES),
  }));

  const scaleAnim = useRef(new Animated.Value(1)).current;
  const spinSeq = useRef(0); // invalidates in-flight spins superseded by a newer action
  const bannedIdsRef = useRef([]);
  const banTallyRef = useRef(0); // lifetime bans, drives reaction tier + milestones

  // Keep the wheel's exclusion state and The Void in sync. When an ID leaves
  // the void, also remove it from this session's seen list so restoring really
  // does make it eligible for the very next spin.
  const applyBannedIds = useCallback((ids, { releaseSeen = false } = {}) => {
    const next = [...new Set((ids || []).filter(Boolean))];

    if (releaseSeen) {
      const nextSet = new Set(next);
      const restored = bannedIdsRef.current.filter((id) => !nextSet.has(id));
      if (restored.length) {
        const restoredSet = new Set(restored);
        setSeenIds((prev) => prev.filter((id) => !restoredSet.has(id)));
      }
    }

    bannedIdsRef.current = next;
    setBannedIds(next);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [banned, entry, banishedBefore, tally] = await Promise.all([
        getBannedSet(),
        getTodaysReading(),
        hasBanishedBefore(),
        getBanTally(),
      ]);

      const lockedId =
        entry?.committed && entry?.recipe?.id ? entry.recipe.id : null;

      // Commitment always wins over an old inconsistent void entry. This can
      // only be needed for data created before locked dishes became protected.
      if (lockedId && banned.has(lockedId)) {
        await unbanRecipe(lockedId);
        banned.delete(lockedId);
      }

      if (cancelled) return;
      applyBannedIds([...banned]);
      setCommittedId(lockedId);
      setHasBanished(banishedBefore);
      banTallyRef.current = tally;

      // Reopen straight onto tonight's committed dish. Fate is a moment;
      // commitment is what lasts.
      if (lockedId) {
        const r = entry.recipe;
        setRecipe(r);
        setSeenIds([r.id]);
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
  }, [applyBannedIds]);

  // RecipeScreen can lock a dish while this screen remains mounted underneath
  // it. Refresh both commitment and void state whenever the wheel regains focus
  // so the 86 control becomes impossible immediately on return.
  useFocusEffect(
    useCallback(() => {
      let active = true;

      (async () => {
        const [banned, entry] = await Promise.all([
          getBannedSet(),
          getTodaysReading(),
        ]);
        const lockedId =
          entry?.committed && entry?.recipe?.id ? entry.recipe.id : null;

        if (lockedId && banned.has(lockedId)) {
          await unbanRecipe(lockedId);
          banned.delete(lockedId);
        }

        if (!active) return;
        applyBannedIds([...banned], { releaseSeen: true });
        setCommittedId(lockedId);
      })().catch(() => {});

      return () => {
        active = false;
      };
    }, [applyBannedIds]),
  );

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
      setBanishing(false);
      setBanishMsg(null);
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

  // Spinning out of a banish is the normal way to leave the moment. The dish
  // still on screen is the one we just cast out, so a failed fetch must land at
  // idle — restoring it un-struck would hand back a "See the recipe" button for
  // something that is now banned.
  const handleSpin = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    runSpin({ keepCurrentOnFail: !banishing });
  }, [runSpin, banishing]);

  // 86: a beat, not an ending. No spin, no confirm, no timer — the dish stays on
  // the reel struck out, an angered haptic fires, and a void-coded card takes the
  // stage under it. First banish ever gets the "what have I done" line; every one
  // after gets the cheeky pool. The moment holds until the user spins out of it,
  // so they decide how long the universe gets to sulk.
  const handle86 = useCallback(() => {
    if (
      banishing ||
      !recipe ||
      phase !== "revealed" ||
      loading ||
      recipe.id === committedId
    ) {
      return;
    }
    const victim = recipe;
    const first = !hasBanished;

    // Angered: a heavy thump chased by an error buzz.
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => {});
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(
      () => {},
    );

    // Lifetime, not void size — so restoring a dish and re-banishing it can't
    // replay a milestone you've already heard.
    const count = ++banTallyRef.current;
    setBanTally(count);
    applyBannedIds(
      bannedIdsRef.current.includes(victim.id)
        ? bannedIdsRef.current
        : [...bannedIdsRef.current, victim.id],
    );
    banRecipe(victim).catch(() => {
      applyBannedIds(bannedIdsRef.current.filter((id) => id !== victim.id));
    });
    if (first) {
      setHasBanished(true);
      markBanishedBefore();
    }

    setBanishMsg(first ? FIRST_BANISH : banReactionFor(count));
    setBanishing(true); // recipe stays as the struck victim; phase stays "revealed"
  }, [
    banishing,
    recipe,
    phase,
    loading,
    committedId,
    hasBanished,
    applyBannedIds,
  ]);

  const handleVoidChange = useCallback(
    (ids) => {
      // The Void is a modal inside the header, not a navigation push, so focus
      // never changes and useFocusEffect never refires. This is the only sync
      // path — and since the banish moment now persists until the next spin,
      // the struck dish can be pardoned from in there while it's still on the
      // reel. If that happens, stop claiming it's gone.
      const settle = (next) => {
        applyBannedIds(next, { releaseSeen: true });
        if (banishing && recipe && !(next || []).includes(recipe.id)) {
          setBanishing(false);
          setBanishMsg(null);
        }
      };

      if (Array.isArray(ids)) {
        settle(ids);
        return;
      }

      getBannedSet()
        .then((set) => settle([...set]))
        .catch(() => {});
    },
    [applyBannedIds, banishing, recipe],
  );

  const handleSeeRecipe = useCallback(() => {
    if (recipe && !banishing) navigation.navigate("Recipe", { recipe });
  }, [recipe, banishing, navigation]);

  const isSpinning = phase === "spinning";
  const isRevealed = phase === "revealed" && !!recipe;
  const isLocked = isRevealed && recipe?.id === committedId;
  // Mid-banish the reroll copy has to read as an exit, not as another cheeky
  // aside — whichever line the session index happens to have landed on.
  const rerollLabel = banishing
    ? "Spin again"
    : REROLL_LABELS[
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
        onVoidChange={handleVoidChange}
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
              disabled={isSpinning || loading || banishing}
              style={({ pressed }) => [
                styles.wheelTap,
                pressed && !isSpinning && { transform: [{ scale: 0.97 }] },
              ]}
            >
              <Centerpiece
                phase={phase}
                recipe={recipe}
                size={CENTER_SIZE}
                banished={banishing}
                badge={
                  isRevealed && !banishing && recipe?.id === committedId
                    ? "LOCKED IN"
                    : null
                }
              />
            </Pressable>
          )}

          <View style={styles.content}>
            {booting ? null : banishing ? (
              <View
                style={styles.banishCard}
                accessibilityLiveRegion="polite"
                accessibilityRole="alert"
              >
                <Text style={styles.banishEyebrow}>BANISHED TO THE VOID</Text>
                <Text style={styles.banishLine}>{banishMsg}</Text>
              </View>
            ) : isRevealed ? (
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
              // "You've 86'd everything" runs long — clipping it to two lines
              // ate the punchline.
              <Text style={styles.errorText} numberOfLines={4}>
                {errorMsg}
              </Text>
            ) : (
              // The subline now lives in the dock, under the Spin button —
              // close to the thing it's talking about, and it fills the slot
              // the reserved shelf leaves empty at idle.
              <Text style={styles.headline}>{copy.idleHeadline}</Text>
            )}
          </View>
        </View>
        {/* The dock. A fixed shelf the controls live on, flush to the bottom
            edge — so the hero above it is a constant size and the reel cannot
            drift when the buttons change. */}
        <View
          style={[styles.dock, { paddingBottom: Math.max(insets.bottom, 16) }]}
        >
          <View style={styles.dockInner}>
          {booting ? null : isRevealed ? (
            <>
              {/* Nothing moves during a banish — the primary slot keeps its
                  place and just goes dark and dead. The joke is the copy. */}
              <PotluckButton
                icon={banishing ? "silverware-clean" : "silverware-fork-knife"}
                title={banishing ? "Gone." : "See the recipe"}
                subtitle={
                  banishing
                    ? "You did this. There's nothing to read."
                    : "Ingredients, steps, the lot"
                }
                gradientColors={banishing ? VOID_GRADIENT : TEAL_GRADIENT}
                shadowColor={banishing ? colors.tealDark : TEAL_SHADOW}
                onPress={handleSeeRecipe}
                disabled={banishing}
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
                {banishing ? (
                  <View
                    style={styles.banishedPill}
                    accessibilityRole="text"
                    accessibilityLabel="This recipe has been 86'd"
                  >
                    <Text style={styles.banishedPillLabel}>86</Text>
                  </View>
                ) : isLocked ? (
                  <View
                    style={styles.lockedPill}
                    accessibilityRole="text"
                    accessibilityLabel="This recipe is locked in and cannot be 86'd"
                  >
                    <Icon source="lock" size={15} color={colors.teal} />
                    <Text style={styles.lockedPillLabel}>Locked</Text>
                  </View>
                ) : (
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
                )}
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
              {/* Held while spinning so the shelf doesn't twitch mid-spin —
                  the wheel is the thing that should be moving, not the copy. */}
              <Text style={styles.dockSubline} numberOfLines={2}>
                {isSpinning ? " " : copy.idleSubline}
              </Text>
            </Animated.View>
          )}
          </View>
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
    // `hero` is flex:1 and centred, so the whole group (reel + this block)
    // re-centres whenever this box changes height — the reel drifts between
    // idle, spinning, revealed and banished, and again mid-reveal as the
    // verdict wraps and the meta row arrives.
    //
    // FIXED height, not minHeight: a floor still lets a tall state grow past it
    // and shunt the reel. One height for every state is the only thing that
    // actually pins it. Anything taller than this box overflows it rather than
    // moving the reel, which is the trade we want.
    marginTop: 14,
    height: 100,
  },
  headline: {
    fontFamily: "RalewayBold",
    fontSize: 22,
    lineHeight: 28,
    color: colors.teal,
    textAlign: "center",
  },

  // The 86 moment — a slab of the void, matching The Void tab in AboutSheet so
  // banishing and reviewing a banishment read as the same place.
  banishCard: {
    width: "100%",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 18,
    backgroundColor: colors.tealDark,
    // Orange, and thick enough to read as a warning band rather than a hairline
    // — the void speaking with the 86 control's own colour.
    borderWidth: 3,
    borderColor: colors.primary,
  },
  banishEyebrow: {
    fontFamily: "RalewayBold",
    fontSize: 10,
    letterSpacing: 1.5,
    color: colors.primary,
    marginBottom: 6,
  },
  banishLine: {
    fontFamily: "RalewayBold",
    fontSize: 17,
    lineHeight: 23,
    color: colors.offWhite,
    textAlign: "center",
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

  // ── The dock ──────────────────────────────────────────────────────────────
  // `hero` is flex:1 and this is its sibling, so any height change down here
  // steals space from the hero and re-centres the reel. The revealed state
  // carries a second row the idle and spinning states don't — 60pt taller — so
  // the reel stepped up the moment a dish landed.
  //
  // Reserving the height on `dockInner` rather than on the outer box is the
  // part that matters: RN sizes min/height border-box, so a reservation on the
  // padded outer element gets eaten by its own paddingBottom, which varies with
  // the device's inset. The inner box has no padding, so its height is exactly
  // the height of the controls and nothing else.
  //
  // Full-bleed via negative margins against `body`'s 16pt gutter, so the shelf
  // meets both screen edges while its contents stay on the same grid as the
  // rest of the screen.
  //
  // Deliberately NOT a card: no radius, no shadow, no lift. The rounded, raised
  // version read as a panel bolted onto the screen — one more surface in an app
  // whose whole pitch is that there's nothing to navigate. Flat and edge-to-edge,
  // it's just where the screen ends and the controls begin. The hairline is the
  // only thing marking it, and it's doing structural work (the comic dots run
  // right up to it), not decorative.
  dock: {
    width: "100%",
    marginHorizontal: -16,
    paddingHorizontal: 16,
    paddingTop: 12,
    backgroundColor: colors.offWhite,
    borderTopWidth: 1,
    borderColor: tealAlpha(0.08),
  },
  dockInner: {
    width: "100%",
    height: DOCK_CONTENT_HEIGHT,
    // Centred, not top-aligned. The idle state is one button in a box sized for
    // two rows, so ~60pt is spare — dumping all of it below the button reads as
    // a gap, while splitting it above and below reads as a button sitting in a
    // shelf. In the revealed state the contents fill the box exactly and this
    // has no effect.
    justifyContent: "center",
  },
  ctaWrap: { width: "100%" },
  // The idle voice, sat under the Spin button in the shelf. Sized so the CTA
  // plus this line comes to roughly the height of the revealed state's two
  // rows, which is what stops the shelf feeling half-empty at idle.
  dockSubline: {
    fontFamily: "Raleway",
    fontSize: 13,
    lineHeight: 18,
    color: colors.teal,
    opacity: 0.5,
    textAlign: "center",
    marginTop: 6,
    paddingHorizontal: 12,
  },

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
  lockedPill: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    paddingVertical: 15,
    paddingHorizontal: 14,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: tealAlpha(0.13),
    backgroundColor: tealAlpha(0.045),
  },
  lockedPillLabel: {
    fontFamily: "RalewaySemiBold",
    fontSize: 13,
    color: colors.teal,
    opacity: 0.7,
  },
  // Void colourway: the button that sends a dish to the void is already dressed
  // as the void. Same dark ground + orange pairing as banishCard, the onboarding
  // aside and The Void well, so the whole mechanic reads as one place.
  banBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 15,
    paddingHorizontal: 18,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: colors.primary,
    backgroundColor: colors.tealDark,
  },
  banBtnLabel: {
    fontFamily: "RalewaySemiBold",
    fontSize: 14,
    color: colors.primary,
  },
  // Spent 86 — identical geometry to banBtn so the row never shifts width, and
  // the same void colourway held at half strength: the button has been used.
  banishedPill: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 15,
    paddingHorizontal: 18,
    borderRadius: 20,
    borderWidth: 3,
    borderColor: colors.primary + "59",
    backgroundColor: colors.tealDark,
    opacity: 0.9,
  },
  banishedPillLabel: {
    fontFamily: "RalewaySemiBold",
    fontSize: 14,
    color: colors.primary,
    opacity: 0.5,
    textDecorationLine: "line-through",
  },
});
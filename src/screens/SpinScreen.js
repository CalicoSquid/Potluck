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
  Share,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Icon } from "react-native-paper";
import { useLazyQuery } from "@apollo/client/react";
import { gql } from "@apollo/client";
import * as Haptics from "expo-haptics";
import he from "he";

import { colors } from "../constants/colors";
import { getTodaysReading, setTodaysReading } from "../lib/readings";
import TonightButton from "../components/TonightButton";
import PotluckHeader from "../components/PotluckHeader";
import ComicBackground from "../components/ComicBackground";
import { TEAL_GRADIENT, TEAL_SHADOW } from "../constants/colors";

// ── Layout ────────────────────────────────────────────────────────────────────
const { width: SCREEN_WIDTH } = Dimensions.get("window");

const WORDMARK_WIDTH  = SCREEN_WIDTH * 0.94;
const WORDMARK_ASPECT = 1500 / 550;
const WORDMARK_HEIGHT = WORDMARK_WIDTH / WORDMARK_ASPECT;

const CENTER_SIZE   = SCREEN_WIDTH * 0.64;
const SPIN_DURATION = 1800;

const RECIPE_URL_BASE = "https://getsavor.recipes/r/"; // ← swap to getsavor.com/r/ if canonical

const REEL_SYMBOLS = ["🍳","🥗","🍝","🍕","🍔","🍜","🥘","🍱","🌮","🥐","🍣","🍲","🥩","🍰","🦞","🌯","🍛","🫕"];

// ── Copy ──────────────────────────────────────────────────────────────────────
const pick = (a) => a[Math.floor(Math.random() * a.length)];

const IDLE_HEADLINES = [
  "Let the universe decide.",
  "What's for dinner?",
  "Leave it to fate.",
  "Hungry? Spin.",
];
const IDLE_SUBLINES = [
  "No scrolling. No deciding. Just cook.",
  "One spin. Dinner sorted.",
  "The wheel knows.",
];
const REVEAL_SUBLINES = [
  "The universe has spoken.",
  "No notes. Go cook.",
  "This is what you're having.",
  "Settled. Get the pan out.",
  "Argue with it later.",
  "Resistance is futile. Also delicious.",
  "That's dinner. No appeals.",
  "Don't make it weird. Just cook it.",
  "Decided. Off you go.",
  "Bold. Go with it.",
  "That's the one. Trust it.",
  "Cook it. Don't overthink it.",
  "You'll thank fate for this one.",
  "This one's a keeper. Move.",
  "Fate's made the call. Honour it.",
  "Stop scrolling. Start cooking.",
  "It's chosen. You're cooking.",
  "Good luck doing better.",
];

// Contextual verdict pools — flavour that nods to what actually landed.
const DESSERT_LINES = [
  "Dessert. No notes.",
  "The universe wants you to have cake.",
  "Straight to the good part, then.",
  "Pudding counts as dinner. Officially, now.",
];
const BAKING_LINES = [
  "Get the oven on.",
  "Baking it is. Mind the timer.",
  "Flour everywhere by tonight. Worth it.",
];
const BRINNER_LINES = [
  "Breakfast. For dinner. The universe insists.",
  "Eggs after dark. Why not.",
  "Brinner. The wheel's feeling chaotic.",
];
const QUICK_LINES = [
  "Quick one. You'll barely notice.",
  "On the table before you change your mind.",
  "Fast. The universe respects your time.",
];
const SLOW_LINES = [
  "Clear the evening — this one takes a while.",
  "A project. The universe believes in you.",
  "Low and slow. Pour something.",
];

const REROLL_LABELS = [
  "Not feeling it? Spin again",
  "Again? Go on then",
  "The universe is patient…",
  "Truly? Once more",
  "…you're impossible",
  "Fine. Spin. (it was right the first time)",
];

// ── Helpers ─────────────────────────────────────────────────────────────────--
const daypartNow = () => {
  const h = new Date().getHours();
  return h >= 5 && h < 11 ? "breakfast" : "dinner";
};

const sumTime = (t) => (t ? (t.hours || 0) * 60 + (t.minutes || 0) : 0);
const totalMins = (r) => {
  const tot = sumTime(r?.times?.total);
  if (tot) return tot;
  return sumTime(r?.times?.prep) + sumTime(r?.times?.cook);
};
const fmtMins = (m) =>
  m < 60 ? `${m} min` : m % 60 ? `${Math.floor(m / 60)}h ${m % 60}m` : `${Math.floor(m / 60)}h`;

const lc = (s) => (typeof s === "string" ? s.toLowerCase() : "");
const hasAny = (hay, words) => words.some((w) => hay.includes(w));

// Sometimes the verdict reflects what landed; otherwise a plain fate line —
// kept ~60/40 so the nod stays a surprise rather than a pattern.
const verdictFor = (recipe) => {
  const hay  = `${lc(recipe?.category)} ${lc(recipe?.cuisine)} ${lc(recipe?.name)}`;
  const mins = totalMins(recipe);
  const pools = [];

  if (hasAny(hay, ["dessert","cake","cookie","brownie","pastry","pie","muffin","tart","pudding","cheesecake","cupcake","doughnut","donut","sweet"])) {
    pools.push(DESSERT_LINES);
  } else if (hasAny(hay, ["bread","loaf","bake","scone","biscuit","focaccia","bagel"])) {
    pools.push(BAKING_LINES);
  }

  if (daypartNow() === "dinner" &&
      hasAny(hay, ["breakfast","brunch","pancake","waffle","omelette","omelet","porridge","granola","french toast","cereal"])) {
    pools.push(BRINNER_LINES);
  }

  if (mins && mins <= 20)      pools.push(QUICK_LINES);
  else if (mins && mins >= 90) pools.push(SLOW_LINES);

  if (pools.length && Math.random() < 0.6) return pick(pick(pools));
  return pick(REVEAL_SUBLINES);
};

const decodeStr = (s) => (typeof s === "string" ? he.decode(s) : s);
const decodeRecipe = (r) => {
  if (!r) return r;
  return {
    ...r,
    name:         decodeStr(r.name),
    description:  decodeStr(r.description),
    category:     decodeStr(r.category),
    cuisine:      decodeStr(r.cuisine),
    recipeYield:  decodeStr(r.recipeYield),
    ingredients:  Array.isArray(r.ingredients)  ? r.ingredients.map(decodeStr)  : r.ingredients,
    instructions: Array.isArray(r.instructions) ? r.instructions.map(decodeStr) : r.instructions,
  };
};

// One housing, three contents. Teal cabinet, orange win-lights.
//   idle     → wheel, floating (no housing, no shadow)
//   spinning → housing lifts in; emoji cycle behind the glass; reel-click haptics
//   revealed → photo lands behind the same glass; gold markers flash; badge + share appear
function Centerpiece({ phase, recipe, size, badge, onShare }) {
  const spinnerRot    = useRef(new Animated.Value(0)).current;
  const wheelOpacity  = useRef(new Animated.Value(1)).current;
  const reelOpacity   = useRef(new Animated.Value(0)).current;
  const cardOpacity   = useRef(new Animated.Value(0)).current;
  const bezelOpacity  = useRef(new Animated.Value(0)).current;
  const markerOpacity = useRef(new Animated.Value(0)).current;
  const lockScale     = useRef(new Animated.Value(1)).current;
  const glow          = useRef(new Animated.Value(0)).current;

  const [symbol, setSymbol] = useState("🍳");
  const tickRef   = useRef(null);
  const rotRef    = useRef(0);
  const prevPhase = useRef(phase);

  const SP = size * 0.72;

  const stopCycle = () => { if (tickRef.current) clearTimeout(tickRef.current); };
  const startCycle = () => {
    let step = 0;
    const tick = () => {
      step++;
      const interval = 55 + Math.min(step / 40, 1) * 150;
      setSymbol((p) => {
        let n;
        do { n = REEL_SYMBOLS[Math.floor(Math.random() * REEL_SYMBOLS.length)]; }
        while (n === p && REEL_SYMBOLS.length > 1);
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
      Animated.timing(spinnerRot, { toValue: rotRef.current, duration: SPIN_DURATION, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
      lockScale.setValue(1);
      Animated.parallel([
        Animated.timing(wheelOpacity,  { toValue: 0,    duration: 200, useNativeDriver: true }),
        Animated.timing(cardOpacity,   { toValue: 0,    duration: 160, useNativeDriver: true }),
        Animated.timing(reelOpacity,   { toValue: 1,    duration: 200, delay: 80, useNativeDriver: true }),
        Animated.timing(bezelOpacity,  { toValue: 1,    duration: 220, useNativeDriver: true }),
        Animated.timing(markerOpacity, { toValue: 0.85, duration: 220, useNativeDriver: true }),
      ]).start();
      startCycle();
    } else if (phase === "revealed") {
      stopCycle();
      const doPop = prev === "spinning";
      cardOpacity.setValue(0);
      if (doPop) lockScale.setValue(0.86);
      Animated.parallel([
        Animated.timing(reelOpacity,  { toValue: 0, duration: 160, useNativeDriver: true }),
        Animated.timing(wheelOpacity, { toValue: 0, duration: 160, useNativeDriver: true }),
        Animated.timing(bezelOpacity, { toValue: 1, duration: 160, useNativeDriver: true }),
        Animated.timing(cardOpacity,  { toValue: 1, duration: 300, delay: 50, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
        Animated.spring(lockScale,    { toValue: 1, friction: 4.5, tension: 320, useNativeDriver: true }),
      ]).start();
      if (doPop) {
        Animated.sequence([
          Animated.timing(markerOpacity, { toValue: 1,   duration: 80,  delay: 40, useNativeDriver: true }),
          Animated.timing(markerOpacity, { toValue: 0.9, duration: 420, easing: Easing.out(Easing.quad), useNativeDriver: true }),
        ]).start();
        Animated.sequence([
          Animated.timing(glow, { toValue: 1, duration: 60, delay: 40, useNativeDriver: true }),
          Animated.timing(glow, { toValue: 0, duration: 420, easing: Easing.out(Easing.quad), useNativeDriver: true }),
        ]).start();
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => {});
      } else {
        markerOpacity.setValue(0.9);
      }
    } else {
      stopCycle();
      Animated.parallel([
        Animated.timing(wheelOpacity,  { toValue: 1, duration: 220, useNativeDriver: true }),
        Animated.timing(reelOpacity,   { toValue: 0, duration: 160, useNativeDriver: true }),
        Animated.timing(cardOpacity,   { toValue: 0, duration: 160, useNativeDriver: true }),
        Animated.timing(bezelOpacity,  { toValue: 0, duration: 220, useNativeDriver: true }),
        Animated.timing(markerOpacity, { toValue: 0, duration: 160, useNativeDriver: true }),
      ]).start();
    }
  }, [phase]);

  useEffect(() => {
    rotRef.current = 2.4 * 360;
    Animated.timing(spinnerRot, { toValue: rotRef.current, duration: 1400, delay: 400, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
    return stopCycle;
  }, []);

  const rotate = spinnerRot.interpolate({ inputRange: [0, 360], outputRange: ["0deg", "360deg"] });

  return (
    <Animated.View style={[cp.wrap, { width: size, height: size, transform: [{ scale: lockScale }] }]}>
      {/* Drop shadow / lift — follows the housing so the idle wheel floats free */}
      <Animated.View style={[StyleSheet.absoluteFill, cp.lift, { opacity: bezelOpacity }]} />

      <View style={[StyleSheet.absoluteFill, cp.frame]}>
        {/* Wheel face */}
        <Animated.View style={[StyleSheet.absoluteFill, cp.center, { opacity: wheelOpacity }]} pointerEvents="none">
          <Animated.Image
            source={require("../../assets/spinner.png")}
            resizeMode="contain"
            style={{ position: "absolute", width: SP, height: SP, top: (size - SP) / 1.4, left: (size - SP) / 2, transform: [{ rotate }] }}
          />
          <Image source={require("../../assets/outer.png")} resizeMode="contain" style={{ width: size, height: size }} />
        </Animated.View>

        {/* Reel face */}
        <Animated.View style={[StyleSheet.absoluteFill, cp.reelGround, { opacity: reelOpacity }]} pointerEvents="none">
          <Text style={cp.symbol}>{symbol}</Text>
        </Animated.View>

        {/* Card face */}
        <Animated.View style={[StyleSheet.absoluteFill, { opacity: cardOpacity }]} pointerEvents="none">
          {recipe?.image ? (
            <Image source={{ uri: recipe.image }} resizeMode="cover" fadeDuration={0} style={StyleSheet.absoluteFill} />
          ) : (
            <View style={[StyleSheet.absoluteFill, cp.center, { backgroundColor: colors.primary + "15" }]}>
              <Text style={{ fontSize: size * 0.28 }}>🍽️</Text>
            </View>
          )}
          <LinearGradient
            colors={["transparent", "rgba(20,40,41,0.9)"]}
            start={{ x: 0.5, y: 0.4 }}
            end={{ x: 0.5, y: 1 }}
            style={cp.scrim}
          />
          <Text style={cp.cardTitle} numberOfLines={2}>{recipe?.name}</Text>
        </Animated.View>

        {/* Teal housing */}
        <Animated.View style={[StyleSheet.absoluteFill, cp.bezel, { opacity: bezelOpacity }]} pointerEvents="none">
          <View style={cp.glassTop} />
          <View style={cp.glassBottom} />
        </Animated.View>

        {/* Gold win-row markers */}
        <Animated.View style={[cp.markerLeft,  { opacity: markerOpacity }]} pointerEvents="none" />
        <Animated.View style={[cp.markerRight, { opacity: markerOpacity }]} pointerEvents="none" />

        {/* Win glow */}
        <Animated.View
          pointerEvents="none"
          style={[StyleSheet.absoluteFill, { backgroundColor: "#FF9800", opacity: glow.interpolate({ inputRange: [0, 1], outputRange: [0, 0.22] }) }]}
        />

        {/* Reading badge + share — live on the card itself, only when revealed */}
        {phase === "revealed" && (
          <>
            {badge ? (
              <Animated.View style={[cp.badge, { opacity: cardOpacity }]} pointerEvents="none">
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
    shadowColor: "#142829",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.18,
    shadowRadius: 16,
    elevation: 12,
  },

  frame: { borderRadius: 26, overflow: "hidden", alignItems: "center", justifyContent: "center" },
  center: { alignItems: "center", justifyContent: "center" },
  reelGround: { backgroundColor: "#fff", alignItems: "center", justifyContent: "center" },
  symbol: { fontSize: 96, lineHeight: 104 },

  scrim: { position: "absolute", left: 0, right: 0, bottom: 0, height: "60%" },
  cardTitle: { position: "absolute", left: 16, right: 16, bottom: 16, fontFamily: "RalewayBold", fontSize: 22, lineHeight: 27, color: "#fff" },

  // Teal cabinet — deeper border + tinted glass so the gold markers pop against it.
  bezel: { borderRadius: 26, borderWidth: 3, borderColor: "rgba(20,40,41,0.55)" },
  glassTop:    { position: "absolute", top: 0, left: 0, right: 0, height: "15%", backgroundColor: "rgba(20,40,41,0.10)" },
  glassBottom: { position: "absolute", bottom: 0, left: 0, right: 0, height: "13%", backgroundColor: "rgba(20,40,41,0.06)" },

  markerLeft: {
    position: "absolute", left: 6, top: "50%", marginTop: -7,
    width: 0, height: 0,
    borderTopWidth: 7, borderBottomWidth: 7, borderLeftWidth: 10,
    borderTopColor: "transparent", borderBottomColor: "transparent", borderLeftColor: "#FFB300",
  },
  markerRight: {
    position: "absolute", right: 6, top: "50%", marginTop: -7,
    width: 0, height: 0,
    borderTopWidth: 7, borderBottomWidth: 7, borderRightWidth: 10,
    borderTopColor: "transparent", borderBottomColor: "transparent", borderRightColor: "#FFB300",
  },

  badge: { position: "absolute", top: 10, left: 10, backgroundColor: "rgba(20,40,41,0.82)", borderRadius: 8, paddingHorizontal: 9, paddingVertical: 5 },
  badgeText: { fontFamily: "RalewayBold", fontSize: 10, letterSpacing: 1, color: "#fff" },

  shareWrap: { position: "absolute", top: 10, right: 10 },
  shareBtn: { width: 34, height: 34, borderRadius: 17, backgroundColor: "rgba(20,40,41,0.55)", alignItems: "center", justifyContent: "center" },
});

// ── GraphQL ───────────────────────────────────────────────────────────────────
const RANDOM_RECIPE = gql`
  query RandomRecipe($excludeIds: [ID], $daypart: String) {
    randomRecipe(excludeIds: $excludeIds, daypart: $daypart) {
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

// Verdict, typed out as if some unseen hand is transmitting it — quote marks
// frame the utterance, an orange caret leads, then vanishes when it's done.
function TypewriterVerdict({ text }) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    setCount(0);
    if (!text) return;
    let i = 0;
    const id = setInterval(() => {
      i += 1;
      setCount(i);
      if (i >= text.length) clearInterval(id);
    }, 50);
    return () => clearInterval(id);
  }, [text]);

  const full   = text || "";
  const shown  = full.slice(0, count);
  const typing = count < full.length;

  return (
    <Text style={styles.revealQuote}>
      <Text style={styles.quoteMark}>“</Text>
      {shown}
      {typing ? <Text style={styles.caret}>|</Text> : null}
      <Text style={styles.quoteMark}>”</Text>
    </Text>
  );
}

// ── Screen ──────────────────────────────────────────────────────────────────--
export default function SpinScreen({ navigation }) {
  const insets = useSafeAreaInsets();

  const [phase,           setPhase]           = useState("idle"); // idle | spinning | revealed
  const [recipe,          setRecipe]          = useState(null);
  const [readingId,       setReadingId]       = useState(null);   // id of today's canonical reading
  const [hadReadingOnOpen,setHadReadingOnOpen]= useState(false);  // drives the header's one-shot pulse
  const [booting,         setBooting]         = useState(true);   // gates first paint until the reading read resolves
  const [hasReadingToday, setHasReadingToday] = useState(false);
  const [sessionSpins,    setSessionSpins]    = useState(0);
  const [seenIds,         setSeenIds]         = useState([]);
  const [errorMsg,        setErrorMsg]        = useState(null);
  const [headerHeight,    setHeaderHeight]    = useState(0);
  const [revealSub,       setRevealSub]       = useState(() => pick(REVEAL_SUBLINES));
  const [copy] = useState(() => ({
    idleHeadline: pick(IDLE_HEADLINES),
    idleSubline:  pick(IDLE_SUBLINES),
  }));

  const scaleAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    let cancelled = false;
    getTodaysReading()
      .then((entry) => {
        if (cancelled || !entry?.recipe?.id) return;
        const r = entry.recipe;
        // Open straight into today's reading instead of a blank wheel.
        setRecipe(r);
        setSeenIds([r.id]);
        setReadingId(r.id);
        setHasReadingToday(true);
        setHadReadingOnOpen(true);
        setRevealSub(verdictFor(r));
        setPhase("revealed");
      })
      .catch(() => {})
      .finally(() => { if (!cancelled) setBooting(false); });
    return () => { cancelled = true; };
  }, []);

  const [fetchRecipe, { loading }] = useLazyQuery(RANDOM_RECIPE, { fetchPolicy: "no-cache" });

  const handleSpin = useCallback(() => {
    if (phase === "spinning" || loading) return;

    setErrorMsg(null);
    setSessionSpins((n) => n + 1);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    setPhase("spinning");

    Animated.sequence([
      Animated.timing(scaleAnim, { toValue: 0.94, duration: 100, easing: Easing.out(Easing.quad),    useNativeDriver: true }),
      Animated.timing(scaleAnim, { toValue: 1,    duration: 220, easing: Easing.out(Easing.back(2)), useNativeDriver: true }),
    ]).start();

    const fetchPromise = fetchRecipe({ variables: { excludeIds: seenIds, daypart: daypartNow() } })
      .then((res) => {
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
        if (error) return recover("Couldn't reach the server. Check your connection and try again.");
        const picked = decodeRecipe(data?.randomRecipe);
        if (!picked) return recover("The universe drew a blank — spin again.");

        setRecipe(picked);
        setSeenIds((prev) => [...prev, picked.id]);
        setRevealSub(verdictFor(picked));
        setPhase("revealed");

        // First spin of the day becomes the canonical reading. Later rerolls
        // reveal normally but never claim the badge or disturb the stored pick
        // (setTodaysReading no-ops on an existing, uncommitted entry).
        if (!hasReadingToday) {
          setHasReadingToday(true);
          setReadingId(picked.id);
        }
        setTodaysReading(picked, { committed: false });
      })
      .catch(() => recover("Something went wrong. Give it another spin."));
  }, [phase, loading, seenIds, recipe, hasReadingToday]);

  const handleSeeRecipe = useCallback(() => {
    if (recipe) navigation.navigate("Recipe", { recipe });
  }, [recipe, navigation]);

  const handleShare = useCallback(() => {
    if (!recipe) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    const url = `${RECIPE_URL_BASE}${recipe.id}`;
    Share.share({
      message: `The universe says I'm making ${recipe.name} tonight. 🎰\n\nSpin yours in Potluck:\n${url}`,
    }).catch(() => {});
  }, [recipe]);

  const isSpinning  = phase === "spinning";
  const isRevealed  = phase === "revealed" && !!recipe;
  const rerollLabel = REROLL_LABELS[Math.min(Math.max(sessionSpins - 1, 0), REROLL_LABELS.length - 1)];

  const mins     = isRevealed ? totalMins(recipe) : 0;
  const timeStr  = mins ? fmtMins(mins) : null;
  const yieldStr = isRevealed ? recipe.recipeYield : null;

  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" translucent backgroundColor="transparent" />

      {headerHeight > 0 && <ComicBackground headerHeight={headerHeight} />}

      <PotluckHeader spinning={isSpinning} hasReading={hadReadingOnOpen} onLayout={(e) => setHeaderHeight(e.nativeEvent.layout.height)} />

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
                badge={isRevealed && recipe?.id === readingId ? "TODAY'S READING" : null}
                onShare={handleShare}
              />
            </Pressable>
          )}

          <View style={styles.content}>
            {booting ? null : isRevealed ? (
              errorMsg ? (
                <Text style={styles.errorText} numberOfLines={2}>{errorMsg}</Text>
              ) : (
                <>
                  <TypewriterVerdict text={revealSub} />
                  {(timeStr || yieldStr) && (
                    <View style={styles.metaRow}>
                      {timeStr && <Text style={styles.metaText}>⏱  {timeStr}</Text>}
                      {timeStr && yieldStr ? <View style={styles.metaDot} /> : null}
                      {yieldStr && <Text style={styles.metaText} numberOfLines={1}>🍽  {yieldStr}</Text>}
                    </View>
                  )}
                </>
              )
            ) : isSpinning ? (
              <Text style={styles.headline}>The universe is deciding…</Text>
            ) : errorMsg ? (
              <Text style={styles.errorText} numberOfLines={2}>{errorMsg}</Text>
            ) : (
              <>
                <Text style={styles.headline}>{copy.idleHeadline}</Text>
                <Text style={styles.subline}>{copy.idleSubline}</Text>
              </>
            )}
          </View>
        </View>
        <View style={[styles.actions, { paddingBottom: Math.max(insets.bottom, 16) }]}>
          {booting ? null : isRevealed ? (
            <>
              <TonightButton
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
                <Icon source="refresh" size={18} color="#142829" />
                <Text style={styles.rerollBtnLabel} numberOfLines={2}>{rerollLabel}</Text>
              </TouchableOpacity>
            </>
          ) : (
            <Animated.View style={[styles.ctaWrap, { transform: [{ scale: scaleAnim }] }]}>
              <TonightButton
                icon="dice-multiple"
                title="Spin"
                subtitle={isSpinning ? "The wheel decides…" : "Let the universe pick dinner"}
                gradientColors={TEAL_GRADIENT}
                shadowColor={TEAL_SHADOW}
                onPress={handleSpin}
                loading={isSpinning}
              />
            </Animated.View>
          )}
        </View>
      </View>
    </View>
  );
}

// ── Styles ──────────────────────────────────────────────────────────────────--
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.offWhite, overflow: "hidden" },
  body: { flex: 1, alignItems: "center", paddingHorizontal: 16 },

  wordmarkSlot: { paddingTop: 14, paddingBottom: 4, alignItems: "center" },

  hero: { flex: 1, width: "100%", alignItems: "center", justifyContent: "center" },

  content: { width: "100%", alignItems: "center", justifyContent: "center", paddingHorizontal: 12, marginTop: 22, minHeight: 56 },
  headline: { fontFamily: "RalewayBold", fontSize: 22, lineHeight: 28, color: "#142829", textAlign: "center" },
  subline:  { fontFamily: "Raleway", fontSize: 14, lineHeight: 18, color: "#142829", opacity: 0.55, textAlign: "center", marginTop: 4 },
  errorText: { fontFamily: "RalewayBold", fontSize: 14, lineHeight: 20, color: "#c0392b", textAlign: "center", opacity: 0.9 },

  revealQuote: { fontFamily: "RalewayBold", fontSize: 19, lineHeight: 26, color: "#142829", textAlign: "center", paddingHorizontal: 4 },
  quoteMark:   { fontFamily: "RalewayBold", fontSize: 24, color: "#FF9800" },
  caret:       { fontFamily: "RalewayBold", fontSize: 19, color: "#FF9800" },

  metaRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", marginTop: 8 },
  metaText: { fontFamily: "RalewaySemiBold", fontSize: 13, color: "#142829", opacity: 0.6 },
  metaDot: { width: 3, height: 3, borderRadius: 1.5, backgroundColor: "#142829", opacity: 0.35, marginHorizontal: 10 },

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
    borderColor: "rgba(20,40,41,0.22)",
    backgroundColor: "rgba(20,40,41,0.03)",
  },
  rerollBtnLabel: {
    fontFamily: "RalewaySemiBold",
    fontSize: 14,
    color: "#142829",
    opacity: 0.85,
    textAlign: "center",
    flexShrink: 1,
  },
});
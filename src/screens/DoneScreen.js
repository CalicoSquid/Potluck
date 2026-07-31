import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  Image,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Share,
  ActivityIndicator,
  StatusBar,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Icon } from "react-native-paper";
import * as Haptics from "expo-haptics";
import { captureRef } from "react-native-view-shot";
import RNShare from "react-native-share";

import {
  colors,
  tealAlpha,
  TEAL_GRADIENT,
  TEAL_SHADOW,
} from "../constants/colors";
import { commitTodaysPick } from "../lib/readings";
import { unbanRecipe } from "../lib/banStore";
import { fmtTotal } from "../lib/time";
import { pick } from "../lib/spinCopy";
import { saveToSavor, openSavorStore } from "../lib/savor";
import ShareCard from "../components/ShareCard";
import PotluckButton from "../components/PotluckButton";
import PotluckHeader from "../components/PotluckHeader";

const RECIPE_URL_BASE = "https://getsavor.recipes/r/";

// The brag. Witty, fate-owning share copy for the moment after you commit — the
// joke is always that dinner was outsourced to the universe and you're just
// complying. A link back to Potluck rides along so whoever reads it can be fed
// by fate too; the brag is the funnel.
const SHARE_LINES = [
  (n, url) =>
    `The universe has spoken: I'm making ${n} tonight. I had no say in the matter.\n\nSpin your own dinner → ${url}`,
  (n, url) =>
    `Tonight's dinner was chosen by a slot machine. It said ${n}. I'm not arguing with fate.\n\n${url}`,
  (n, url) =>
    `I outsourced dinner to the universe and it served up ${n}. Committing anyway.\n\nLet it feed you too → ${url}`,
  (n, url) =>
    `No decisions were made in the choosing of this meal. ${n}, by decree.\n\nSpin yours → ${url}`,
  (n, url) =>
    `Stopped scrolling, let Potluck decide. ${n} it is, apparently.\n\n${url}`,
  (n, url) =>
    `Fate rolled the wheel and landed on ${n}. Who am I to question it.\n\nGet your verdict → ${url}`,
];

const SHARE_LABELS = [
  "Share the verdict",
  "Brag about it",
  "Blame the universe",
  "Tell someone",
];

// Short, punchy poster captions for the share card. The URL and brand mark live
// on the card footer, so these stay clean one-liners.
const CARD_CAPTIONS = [
  "The universe made me cook this.",
  "I let a slot machine pick dinner.",
  "Fate said this. I complied.",
  "Dinner, as decreed by the universe.",
  "Chosen by the wheel. Not by me.",
  "No decisions. Just this.",
];

const EYEBROWS = ["THAT'S DECIDED", "DINNER, SORTED", "THE VERDICT"];
const CLOSERS = [
  (n) => `${n} it is.`,
  (n) => `Right then — ${n}.`,
  (n) => `${n}. Sorted.`,
  (n) => `Tonight, it's ${n}.`,
];
const EXHALES = [
  "Put the phone down. You've got cooking to do.",
  "That's the hard part over. The rest is just cooking.",
  "No more spinning. Go make it.",
  "Decision made. Off you go.",
];

export default function DoneScreen({ navigation, route }) {
  const recipe = route.params?.recipe;
  const insets = useSafeAreaInsets();

  const [eyebrow] = useState(() => pick(EYEBROWS));
  const [closer] = useState(() => pick(CLOSERS)(recipe?.name ?? "dinner"));
  const [exhale] = useState(() => pick(EXHALES));
  const [shareLine] = useState(() => pick(SHARE_LINES));
  const [shareLabel] = useState(() => pick(SHARE_LABELS));
  const [cardCaption] = useState(() => pick(CARD_CAPTIONS));

  const [imgLoaded, setImgLoaded] = useState(() => !recipe?.image); // no photo → nothing to wait for
  const [imgFailed, setImgFailed] = useState(false);
  const [sharing, setSharing] = useState(false);
  const cardRef = useRef(null);
  const pendingShareRef = useRef(false);
  const shareTimeoutRef = useRef(null);

  const timeStr = fmtTotal(recipe);
  const yieldStr = recipe?.recipeYield || null;

  // Reaching Done is the commitment signal — this dish becomes today's pick,
  // overriding whatever the universe first served (or an earlier commitment).
  useEffect(() => {
    if (recipe?.id) {
      Promise.all([
        unbanRecipe(recipe.id),
        commitTodaysPick(recipe),
      ]).catch(() => {});
    }
    return () => {
      if (shareTimeoutRef.current) clearTimeout(shareTimeoutRef.current);
    };
  }, []);

  // Fallback: plain text + link share. Used when the card can't be produced —
  // the photo failed to load, capture threw, or the OS share sheet is missing.
  const fallbackTextShare = () => {
    if (!recipe?.name) return;
    const url = `${RECIPE_URL_BASE}${recipe.id}`;
    Share.share({ message: shareLine(recipe.name, url) }).catch(() => {});
  };

  // Snapshot the off-screen ShareCard to an image and open the share sheet
  // with the poster and a tappable caption + link riding along together.
  const runCardShare = async () => {
    setSharing(true);
    let uri;
    try {
      await new Promise((r) => setTimeout(r, 60)); // let the card paint a frame
      uri = await captureRef(cardRef, {
        format: "png",
        quality: 1,
        result: "tmpfile",
      });
    } catch {
      // Capture failed — no poster to share, drop to the text+link fallback.
      fallbackTextShare();
      setSharing(false);
      return;
    }

    const url = `${RECIPE_URL_BASE}${recipe.id}`;
    try {
      await RNShare.open({
        url: uri,
        type: "image/png",
        message: shareLine(recipe.name, url),
        dialogTitle: "Share your verdict",
        failOnCancel: false,
      });
    } catch (err) {
      // failOnCancel:false should swallow user dismissals, but some platforms
      // still reject — only fall back on a genuine failure, not a cancel.
      const msg = String(err?.message || "").toLowerCase();
      const userCancelled =
        msg.includes("cancel") || msg.includes("did not share");
      if (!userCancelled) fallbackTextShare();
    } finally {
      setSharing(false);
    }
  };

  // The card's photo finished loading. If the user already tapped share while it
  // was loading, fire now.
  const onCardImgLoad = () => {
    setImgLoaded(true);
    if (pendingShareRef.current) {
      pendingShareRef.current = false;
      if (shareTimeoutRef.current) clearTimeout(shareTimeoutRef.current);
      runCardShare();
    }
  };

  // Photo failed — the card would look broken, so drop to the link share.
  const onCardImgError = () => {
    setImgFailed(true);
    setImgLoaded(true);
    if (pendingShareRef.current) {
      pendingShareRef.current = false;
      if (shareTimeoutRef.current) clearTimeout(shareTimeoutRef.current);
      setSharing(false);
      fallbackTextShare();
    }
  };

  const handleShare = () => {
    if (sharing || !recipe?.name) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    if (imgFailed) return fallbackTextShare();
    if (recipe.image && !imgLoaded) {
      // Photo still loading — show the spinner and fire the moment it's ready.
      // But don't wait forever: a stalled image (dodgy connection, silent CDN
      // hang) never resolves onLoad/onError, which would trap the button in
      // "Conjuring…". After 8s, give up on the poster and share text + link.
      pendingShareRef.current = true;
      setSharing(true);
      shareTimeoutRef.current = setTimeout(() => {
        if (!pendingShareRef.current) return;
        pendingShareRef.current = false;
        setSharing(false);
        fallbackTextShare();
      }, 8000);
      return;
    }
    runCardShare();
  };

  const handleSave = () => saveToSavor(recipe?.id);

  return (
    <View style={styles.root}>
      <StatusBar
        barStyle="dark-content"
        translucent
        backgroundColor="transparent"
      />

      <PotluckHeader onBack={() => navigation.goBack()} />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.content,
          { paddingBottom: 28 + (insets.bottom || 12) },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* The dish */}
        {recipe?.image ? (
          <Image
            source={{ uri: recipe.image }}
            style={styles.dish}
            resizeMode="cover"
          />
        ) : (
          <View style={[styles.dish, styles.dishFallback]}>
            <Text style={styles.dishFallbackIcon}>🍽️</Text>
          </View>
        )}

        {/* Sealed — this dish is now today's reading */}
        <View style={styles.lockPill}>
          <Icon source="lock" size={11} color="#fff" />
          <Text style={styles.lockPillText}>{eyebrow}</Text>
        </View>

        <Text style={styles.closer} numberOfLines={3}>
          {closer}
        </Text>

        {timeStr || yieldStr ? (
          <View style={styles.metaRow}>
            {timeStr ? <Text style={styles.metaText}>⏱ {timeStr}</Text> : null}
            {timeStr && yieldStr ? <View style={styles.metaDot} /> : null}
            {yieldStr ? (
              <Text style={styles.metaText} numberOfLines={1}>
                🍽 {yieldStr}
              </Text>
            ) : null}
          </View>
        ) : null}

        <Text style={styles.exhale}>{exhale}</Text>

        {/* The natural next move. You lock in BEFORE you cook, so this screen
            is a commitment, not a completion — and the first thing anyone wants
            from a dish they've just committed to is the method. `navigate`, not
            `push`: Recipe is already below this in the stack, so this pops back
            to the existing instance instead of growing the stack every lap. */}
        {recipe?.name ? (
          <View style={styles.cookBlock}>
            <PotluckButton
              icon="silverware-fork-knife"
              title="Get cooking"
              subtitle="Ingredients, steps, the lot"
              gradientColors={TEAL_GRADIENT}
              shadowColor={TEAL_SHADOW}
              onPress={() => navigation.navigate("Recipe", { recipe })}
            />
          </View>
        ) : null}

        {/* The brag — witty share of what fate chose */}
        {recipe?.name ? (
          <TouchableOpacity
            style={styles.shareBtn}
            onPress={handleShare}
            activeOpacity={0.7}
            disabled={sharing}
          >
            {sharing ? (
              <ActivityIndicator size="small" color={colors.teal} />
            ) : (
              <Icon source="share-variant" size={18} color={colors.teal} />
            )}
            <Text style={styles.shareBtnLabel}>
              {sharing ? "Conjuring…" : shareLabel}
            </Text>
          </TouchableOpacity>
        ) : null}

        {/* One soft Savor nudge */}
        <View style={styles.savorBlock}>
          <Text style={styles.savorLine}>
            Savor is where recipes like this live.
          </Text>
          <PotluckButton
            imageIcon={require("../../assets/savor-logo.png")}
            title="Save this to Savor"
            subtitle="Keep it for next time"
            onPress={handleSave}
          />
        </View>

        {/* Quiet escape */}
        <TouchableOpacity
          onPress={() => navigation.popToTop()}
          activeOpacity={0.6}
          style={styles.spinAgain}
          hitSlop={{ top: 8, bottom: 8, left: 16, right: 16 }}
        >
          <Text style={styles.spinAgainLabel}>↩ Back to the wheel</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Off-screen poster, snapshotted for image sharing. Laid out but pushed
          off-screen so its photo loads and it's capturable, without being seen. */}
      {recipe?.name ? (
        <View style={styles.cardStage} pointerEvents="none">
          <ShareCard
            ref={cardRef}
            recipe={recipe}
            caption={cardCaption}
            onImageReady={onCardImgLoad}
            onImageError={onCardImgError}
          />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.offWhite },
  cardStage: { position: "absolute", left: -9999, top: 0 },
  scroll: { flex: 1 },
  content: {
    flexGrow: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
    paddingTop: 24,
  },

  dish: {
    width: 132,
    height: 132,
    borderRadius: 66,
    marginBottom: 24,
    backgroundColor: "#fff",
    elevation: 4,
    shadowColor: colors.teal,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.14,
    shadowRadius: 10,
  },
  dishFallback: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.primary + "15",
  },
  dishFallbackIcon: { fontSize: 52 },

  lockPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: colors.teal,
    borderRadius: 20,
    paddingVertical: 5,
    paddingHorizontal: 12,
    marginBottom: 14,
  },
  lockPillText: {
    fontFamily: "RalewayBold",
    fontSize: 10,
    letterSpacing: 1.6,
    color: "#fff",
  },

  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 12,
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

  closer: {
    fontFamily: "RalewayBold",
    fontSize: 26,
    lineHeight: 32,
    color: colors.teal,
    textAlign: "center",
  },
  exhale: {
    fontFamily: "Raleway",
    fontSize: 15,
    lineHeight: 22,
    color: colors.teal,
    opacity: 0.6,
    textAlign: "center",
    marginTop: 10,
    maxWidth: 300,
  },

  shareBtn: {
    marginTop: 26,
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
  shareBtnLabel: {
    fontFamily: "RalewaySemiBold",
    fontSize: 15,
    color: colors.teal,
    opacity: 0.85,
  },

  cookBlock: { width: "100%", marginTop: 24 },
  savorBlock: { width: "100%", alignItems: "center", marginTop: 28 },
  savorLine: {
    fontFamily: "Raleway",
    fontSize: 13,
    lineHeight: 19,
    color: colors.teal,
    opacity: 0.55,
    textAlign: "center",
    marginBottom: 4,
    maxWidth: 300,
  },

  spinAgain: { marginTop: 16, paddingVertical: 8 },
  spinAgainLabel: {
    fontFamily: "RalewaySemiBold",
    fontSize: 13,
    color: colors.teal,
    opacity: 0.5,
    letterSpacing: 0.2,
  },
});
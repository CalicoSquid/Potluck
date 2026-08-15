import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Pressable,
  Image,
  Linking,
  Dimensions,
  StatusBar,
  ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Icon } from "react-native-paper";
import he from "he";
import * as Haptics from "expo-haptics";

import {
  colors,
  tealAlpha,
  TEAL_GRADIENT,
  TEAL_SHADOW,
  PRIMARY_GRADIENT,
} from "../constants/colors";
import { getTodaysReading, commitTodaysPick } from "../lib/readings";
import { unbanRecipe } from "../lib/banStore";
import { pick } from "../lib/spinCopy";
import { saveToSavor } from "../lib/savor";
import PotluckButton from "../components/PotluckButton";
import PotluckCard from "../components/PotluckCard";
import PotluckHeader from "../components/PotluckHeader";
import TabBar from "../components/TabBar";
import InlineTimes from "../components/InlineTimes";
import IngredientList from "../components/IngredientList";
import ShopTab from "../components/ShopTab";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

// Used in the confirm dialog when a *different* dish is already locked in
// today. These used to be crammed into the button's subtitle, where a recipe
// name never fit and truncated to things like "Bumps Recipe… for today." The
// dialog has room for a whole sentence, so the voice survives and the button
// gets a short, fixed line instead. Dry, fate-aware, mildly put-out — the
// universe permitting itself to be overruled.
const REPLACE_LINES = [
  (n) => `Bumps ${n} for today.`,
  (n) => `Overrules ${n}. Bold.`,
  (n) => `Replaces ${n} — fate sighs.`,
  (n) => `Knocks ${n} off the top.`,
];

// Still trimmed, but generously — this now lands in a dialog body, not a button.
const shortName = (s, n = 40) =>
  s && s.length > n ? `${s.slice(0, n - 1).trimEnd()}…` : s;

export default function RecipeScreen({ navigation, route }) {
  const { recipe, mode } = route.params;
  // Opened from the week's history (or The Void) rather than from a fresh spin.
  // These dishes are already past — the user came to keep one, not to overwrite
  // tonight's dinner with it, so Savor becomes the primary action and locking
  // in is demoted to a deliberate secondary.
  const isHistory = mode === "history";
  const [activeTab, setActiveTab] = useState("Recipe");
  const insets = useSafeAreaInsets();

  const tags = [recipe.cuisine, recipe.category].filter(Boolean);
  const stickyHeight = 94 + 94 + 30 + 12 + (insets.bottom || 12);

  // The hero used to branch on recipe.image being *truthy*, which is not the
  // same as it being loadable. A dead URL, a hotlink block or a slow CDN all
  // gave you a blank 220px band with no placeholder and no spinner. Track the
  // actual load instead.
  const [imgFailed, setImgFailed] = useState(false);
  const [imgLoading, setImgLoading] = useState(true);

  useEffect(() => {
    setImgFailed(false);
    setImgLoading(true);
  }, [recipe.id]);

  const [locked, setLocked] = useState(false);
  const [replaceName, setReplaceName] = useState(null); // name of the dish this one would bump, if any
  const [confirmReplace, setConfirmReplace] = useState(null); // the in-voice line, shown in the dialog

  // On entry, reconcile against today's committed pick (if any):
  //   • same dish     → already locked in, reflect that
  //   • different dish → locking this one bumps it; say so, in voice
  //   • nothing / just a fate-spin → normal "your one save" copy
  useEffect(() => {
    getTodaysReading()
      .then((entry) => {
        if (!entry?.committed) return;
        if (entry.recipe?.id === recipe.id) {
          setLocked(true);
        } else if (entry.recipe?.name) {
          setReplaceName(shortName(he.decode(entry.recipe.name)));
        }
      })
      .catch(() => {});
  }, []);

  // Replacing today's pick is the one destructive action in the app — it
  // overwrites a commitment. Confirm it, but only in that case: a first lock of
  // the day stays one tap, because that's the whole point of the app.
  const requestLock = () => {
    if (replaceName) {
      setConfirmReplace(pick(REPLACE_LINES)(replaceName));
      return;
    }
    handleLock();
  };

  const handleLock = async () => {
    setConfirmReplace(null);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(
      () => {},
    );

    // A locked-in dish can never remain in The Void. This also repairs any old
    // inconsistent local state created before locked dishes were protected.
    await Promise.all([
      unbanRecipe(recipe.id),
      commitTodaysPick(recipe),
    ]).catch(() => {});

    setLocked(true);
    setReplaceName(null);
    navigation.navigate("Done", { recipe });
  };

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
          styles.scrollContent,
          { paddingBottom: stickyHeight + 24 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Hero image ── */}
        {recipe.image && !imgFailed ? (
          <View style={styles.imageWrap}>
            <Image
              source={{ uri: recipe.image }}
              style={styles.image}
              resizeMode="cover"
              onLoadStart={() => setImgLoading(true)}
              onLoad={() => setImgLoading(false)}
              onError={() => {
                setImgLoading(false);
                setImgFailed(true);
              }}
            />
            {imgLoading && (
              <View
                pointerEvents="none"
                style={[StyleSheet.absoluteFill, styles.imageLoading]}
              >
                <ActivityIndicator color={colors.primary} />
              </View>
            )}
          </View>
        ) : (
          <View style={[styles.imageWrap, styles.imagePlaceholder]}>
            <Text style={styles.imagePlaceholderIcon}>🍽️</Text>
          </View>
        )}

        {/* ── Meta ── */}
        <View style={styles.metaSection}>
          {tags.length > 0 && (
            <View style={styles.tags}>
              {tags.map((tag) => (
                <View key={tag} style={styles.tag}>
                  <Text style={styles.tagText}>{tag.toUpperCase()}</Text>
                </View>
              ))}
            </View>
          )}
          <Text style={styles.recipeName}>{he.decode(recipe.name)}</Text>
          {recipe.description ? (
            <Text style={styles.description}>
              {he.decode(recipe.description)}
            </Text>
          ) : null}
          <InlineTimes times={recipe.times} />
          {recipe.sourceUrl ? (
            <TouchableOpacity
              onPress={() => Linking.openURL(recipe.sourceUrl).catch(() => {})}
              activeOpacity={0.7}
              hitSlop={{ top: 6, bottom: 6, left: 4, right: 4 }}
              style={styles.sourceRow}
            >
              <Icon source="web" size={11} color={colors.teal} />
              <Text style={styles.sourceUrl} numberOfLines={1}>
                {
                  recipe.sourceUrl
                    .replace(/^https?:\/\/(www\.)?/, "")
                    .split("/")[0]
                }
              </Text>
            </TouchableOpacity>
          ) : null}
        </View>

        {/* ── Tabs ── */}
        <TabBar active={activeTab} onChange={setActiveTab} />

        {activeTab === "Recipe" ? (
          <View style={styles.tabContent}>
            <Text style={styles.sectionLabel}>Ingredients</Text>
            <IngredientList
              ingredients={recipe.ingredients}
              recipeYield={recipe.recipeYield}
            />
            <View style={styles.sectionDivider} />
            <Text style={styles.sectionLabel}>Steps</Text>
            {(recipe.instructions || []).length === 0 ? (
              <Text style={styles.emptyState}>
                No steps available for this recipe.
              </Text>
            ) : (
              (recipe.instructions || []).map((step, i) => (
                <PotluckCard key={i} style={styles.stepCard}>
                  <View style={styles.stepRow}>
                    <LinearGradient
                      colors={[colors.gradientStart, colors.gradientEnd]}
                      style={styles.stepBadge}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                    >
                      <Text style={styles.stepNumber}>{i + 1}</Text>
                    </LinearGradient>
                    <Text style={styles.stepText}>{step}</Text>
                  </View>
                </PotluckCard>
              ))
            )}

            {/* End of the method — the point where someone has actually read
                the thing and might want to keep it. Down here it's an offer,
                not a pitch: it costs the sticky bottom nothing, and you only
                meet it if you scrolled all the way through. Grey, not gradient,
                so it never competes with the lock CTA. */}
            <TouchableOpacity
              style={styles.savorBtn}
              onPress={() => saveToSavor(recipe.id)}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel="Save this recipe to Savor"
            >
              <Image
                source={require("../../assets/savor-logo.webp")}
                style={styles.savorBtnLogo}
                resizeMode="contain"
              />
              <View style={styles.savorBtnText}>
                <Text style={styles.savorBtnTitle}>Save this to Savor</Text>
                <Text style={styles.savorBtnSub}>Keep it for good</Text>
              </View>
              <Icon
                source="chevron-right"
                size={20}
                color={tealAlpha(0.35)}
              />
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.tabContent}>
            <ShopTab
              ingredients={recipe.ingredients}
              recipeName={recipe.name}
              recipeId={recipe.id}
              recipeYield={recipe.recipeYield}
            />
          </View>
        )}
      </ScrollView>

      {/* ── Sticky bottom ── */}
      <View
        style={[styles.stickyBottom, { paddingBottom: insets.bottom || 12 }]}
      >
        {isHistory ? (
          <>
            <PotluckButton
              icon="bookmark-plus-outline"
              title="Save this to Savor"
              subtitle="Keep it for good"
              gradientColors={PRIMARY_GRADIENT}
              shadowColor={TEAL_SHADOW}
              onPress={() => saveToSavor(recipe.id)}
            />

            {/* Still possible, just no longer the only way out. */}
            {!locked && (
              <TouchableOpacity
                style={styles.secondaryBtn}
                onPress={requestLock}
                activeOpacity={0.7}
                hitSlop={{ top: 6, bottom: 6, left: 12, right: 12 }}
              >
                <Icon source="lock-outline" size={15} color={colors.teal} />
                <Text style={styles.secondaryLabel}>
                  {replaceName
                    ? "Make this today's pick instead"
                    : "Make this today's pick"}
                </Text>
              </TouchableOpacity>
            )}
          </>
        ) : (
          <PotluckButton
            icon={locked ? "lock-check" : "lock-outline"}
            title={locked ? "Locked in for today" : "Lock it in"}
            // Generic, never interpolated: the replace copy used to live here
            // and truncated ugly. It's in the confirm dialog now.
            subtitle={
              locked
                ? "Tap to brag about it"
                : replaceName
                  ? "Replaces today's pick"
                  : "Your one save for today"
            }
            gradientColors={TEAL_GRADIENT}
            shadowColor={TEAL_SHADOW}
            // Locked keeps the primary slot because it's also the status —
            // demoting it to a text link would lose the visual confirmation
            // that the dish is sealed. It just advertises honestly now.
            onPress={
              locked ? () => navigation.navigate("Done", { recipe }) : requestLock
            }
          />
        )}

        <TouchableOpacity
          style={styles.spinAgainBtn}
          onPress={() => navigation.goBack()}
          activeOpacity={0.6}
          hitSlop={{ top: 8, bottom: 8, left: 16, right: 16 }}
        >
          <Text style={styles.spinAgainLabel}>
            {/* Once committed, "back to spinning" contradicts the commitment. */}
            {isHistory || locked ? "← Back" : "← Back to spinning"}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Same pattern as The Void's "empty it?" dialog — no new visual language,
          and finally somewhere with room for the whole sentence. */}
      {confirmReplace ? (
        <View style={styles.confirmLayer} accessibilityViewIsModal>
          <Pressable
            style={styles.confirmBackdrop}
            onPress={() => setConfirmReplace(null)}
            android_disableSound
            accessibilityRole="button"
            accessibilityLabel="Cancel replacing today's pick"
          />

          <View style={styles.confirmCard}>
            <View style={styles.confirmIcon}>
              <Icon source="swap-horizontal" size={26} color={colors.white} />
            </View>

            <Text style={styles.confirmEyebrow}>ALREADY LOCKED IN</Text>
            <Text style={styles.confirmTitle}>Swap today's pick?</Text>
            <Text style={styles.confirmBody}>{confirmReplace}</Text>

            <View style={styles.confirmActions}>
              <TouchableOpacity
                style={styles.confirmCancel}
                onPress={() => setConfirmReplace(null)}
                activeOpacity={0.7}
              >
                <Text style={styles.confirmCancelLabel}>Leave it as it is</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.confirmSwap}
                onPress={handleLock}
                activeOpacity={0.85}
              >
                <Icon source="lock-check" size={16} color={colors.white} />
                <Text style={styles.confirmSwapLabel}>Lock this one in</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      ) : null}
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.offWhite },
  scroll: { flex: 1 },
  scrollContent: { gap: 16 },

  imageWrap: { width: SCREEN_WIDTH, height: 220 },
  image: { width: "100%", height: "100%" },
  imagePlaceholder: {
    backgroundColor: colors.primary + "15",
    alignItems: "center",
    justifyContent: "center",
  },
  imagePlaceholderIcon: { fontSize: 52 },
  // Sits over the image until it resolves, so the band is never dead white.
  imageLoading: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.primary + "12",
  },

  metaSection: { paddingHorizontal: 20, gap: 8 },
  tags: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  tag: {
    backgroundColor: colors.primary,
    borderRadius: 20,
    paddingVertical: 4,
    paddingHorizontal: 12,
  },
  tagText: {
    fontFamily: "RalewayBold",
    fontSize: 11,
    color: "#fff",
    letterSpacing: 0.5,
  },
  recipeName: {
    fontFamily: "RalewayBold",
    fontSize: 24,
    color: colors.teal,
    lineHeight: 30,
    marginTop: 2,
  },
  description: {
    fontFamily: "Raleway",
    fontSize: 14,
    color: colors.teal,
    opacity: 0.7,
    lineHeight: 22,
  },
  sourceRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginTop: 2,
    opacity: 0.45,
  },
  sourceUrl: {
    flex: 1,
    fontFamily: "Raleway",
    fontSize: 11,
    color: colors.teal,
    letterSpacing: 0.1,
    textDecorationLine: "underline",
  },

  tabContent: { paddingHorizontal: 20, gap: 10 },
  sectionLabel: {
    fontFamily: "RalewayBold",
    fontSize: 11,
    color: colors.teal,
    opacity: 0.5,
    letterSpacing: 1.2,
    textTransform: "uppercase",
    marginBottom: 2,
  },
  sectionDivider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: 6,
  },
  emptyState: {
    fontFamily: "Raleway",
    fontSize: 14,
    color: colors.teal,
    opacity: 0.5,
    fontStyle: "italic",
  },

  stepCard: { padding: 14 },
  stepRow: { flexDirection: "row", gap: 14, alignItems: "flex-start" },
  stepBadge: {
    width: 30,
    height: 30,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    marginTop: 2,
  },
  stepNumber: { fontFamily: "RalewayBold", fontSize: 13, color: "#fff" },
  stepText: {
    flex: 1,
    fontFamily: "Raleway",
    fontSize: 15,
    color: colors.teal,
    lineHeight: 23,
  },

  stickyBottom: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#fff",
    paddingHorizontal: 20,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    elevation: 10,
    shadowColor: colors.teal,
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
  },
  // History mode's demoted lock action. Quiet enough that Savor stays the
  // obvious move, present enough that overwriting today is still one tap.
  secondaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    marginTop: 10,
    paddingVertical: 13,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  secondaryLabel: {
    fontFamily: "RalewaySemiBold",
    fontSize: 13.5,
    color: colors.teal,
    opacity: 0.8,
  },
  // Deliberately grey and flat — a quiet offer at the end of the recipe, not
  // another gradient button shouting alongside the lock CTA.
  savorBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginTop: 24,
    paddingVertical: 13,
    paddingHorizontal: 14,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: tealAlpha(0.03),
  },
  savorBtnLogo: { width: 30, height: 30 },
  savorBtnText: { flex: 1 },
  savorBtnTitle: {
    fontFamily: "RalewaySemiBold",
    fontSize: 14,
    color: colors.teal,
  },
  savorBtnSub: {
    fontFamily: "Raleway",
    fontSize: 12,
    color: colors.teal,
    opacity: 0.55,
    marginTop: 1,
  },

  // ── Replace confirmation ──────────────────────────────────────────────────
  confirmLayer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 20,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  confirmBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(12, 28, 29, 0.72)",
  },
  confirmCard: {
    zIndex: 1,
    width: "100%",
    maxWidth: 380,
    alignItems: "center",
    paddingHorizontal: 22,
    paddingTop: 24,
    paddingBottom: 20,
    borderRadius: 26,
    borderWidth: 1,
    borderColor: tealAlpha(0.12),
    backgroundColor: colors.white,
    shadowColor: colors.teal,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.24,
    shadowRadius: 22,
    elevation: 16,
  },
  // Teal, not the void's red — swapping a pick is a decision, not a deletion.
  confirmIcon: {
    width: 56,
    height: 56,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
    borderRadius: 19,
    backgroundColor: colors.teal,
    transform: [{ rotate: "-3deg" }],
  },
  confirmEyebrow: {
    fontFamily: "RalewayBold",
    fontSize: 10,
    lineHeight: 14,
    color: colors.primary,
    letterSpacing: 1.25,
  },
  confirmTitle: {
    marginTop: 3,
    fontFamily: "RalewayBold",
    fontSize: 23,
    lineHeight: 29,
    color: colors.teal,
    textAlign: "center",
  },
  confirmBody: {
    marginTop: 8,
    fontFamily: "Raleway",
    fontSize: 14,
    lineHeight: 21,
    color: colors.teal,
    opacity: 0.66,
    textAlign: "center",
  },
  confirmActions: { width: "100%", marginTop: 20, gap: 9 },
  confirmCancel: {
    minHeight: 46,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 14,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: tealAlpha(0.14),
  },
  confirmCancelLabel: {
    fontFamily: "RalewayBold",
    fontSize: 13,
    color: colors.teal,
    opacity: 0.72,
  },
  confirmSwap: {
    minHeight: 49,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    paddingHorizontal: 14,
    borderRadius: 16,
    backgroundColor: colors.teal,
    shadowColor: colors.teal,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 8,
    elevation: 4,
  },
  confirmSwapLabel: {
    fontFamily: "RalewayBold",
    fontSize: 14,
    color: colors.white,
  },

  spinAgainBtn: { alignItems: "center", paddingVertical: 8, marginTop: 2 },
  spinAgainLabel: {
    fontFamily: "RalewaySemiBold",
    fontSize: 13,
    color: colors.teal,
    opacity: 0.55,
    letterSpacing: 0.2,
  },
});
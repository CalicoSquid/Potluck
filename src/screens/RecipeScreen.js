import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Linking,
  Dimensions,
  StatusBar,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Icon } from "react-native-paper";
import he from "he";
import * as Haptics from "expo-haptics";

import { colors, TEAL_GRADIENT, TEAL_SHADOW, PRIMARY_GRADIENT } from "../constants/colors";
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

// Shown on "Lock it in" only when a *different* dish is already locked in today,
// so the swap is legible without a modal. Dry, fate-aware, mildly put-out — the
// universe permitting itself to be overruled.
const REPLACE_LINES = [
  (n) => `Bumps ${n} for today.`,
  (n) => `Overrules ${n}. Bold.`,
  (n) => `Replaces ${n} — fate sighs.`,
  (n) => `Knocks ${n} off the top.`,
];

// Keep the interpolated name short so the subtitle stays a tidy line.
const shortName = (s, n = 18) =>
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

  const [locked, setLocked] = useState(false);
  const [replaceLine, setReplaceLine] = useState(null); // set when a *different* dish is already locked in today

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
          setReplaceLine(pick(REPLACE_LINES)(shortName(he.decode(entry.recipe.name))));
        }
      })
      .catch(() => {});
  }, []);

  const handleLock = async () => {
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
        {recipe.image ? (
          <View style={styles.imageWrap}>
            <Image
              source={{ uri: recipe.image }}
              style={styles.image}
              resizeMode="cover"
            />
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
                onPress={handleLock}
                activeOpacity={0.7}
                hitSlop={{ top: 6, bottom: 6, left: 12, right: 12 }}
              >
                <Icon source="lock-outline" size={15} color={colors.teal} />
                <Text style={styles.secondaryLabel}>
                  {replaceLine
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
            subtitle={
              locked
                ? "Today's pick — tap to go cook"
                : replaceLine || "Your one save for today"
            }
            gradientColors={TEAL_GRADIENT}
            shadowColor={TEAL_SHADOW}
            onPress={
              locked ? () => navigation.navigate("Done", { recipe }) : handleLock
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
            {isHistory ? "← Back" : "← Back to spinning"}
          </Text>
        </TouchableOpacity>
      </View>
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
  spinAgainBtn: { alignItems: "center", paddingVertical: 8, marginTop: 2 },
  spinAgainLabel: {
    fontFamily: "RalewaySemiBold",
    fontSize: 13,
    color: colors.teal,
    opacity: 0.55,
    letterSpacing: 0.2,
  },
});
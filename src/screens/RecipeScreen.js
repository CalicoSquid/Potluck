import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Dimensions,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { colors } from "../constants/colors";
import TonightButton from "../components/TonightButton";
import TonightCard from "../components/TonightCard";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

const formatTime = (t) => {
  if (!t) return null;
  const parts = [];
  if (t.hours > 0)   parts.push(`${t.hours}h`);
  if (t.minutes > 0) parts.push(`${t.minutes}m`);
  return parts.length ? parts.join(" ") : null;
};

// ── Times bar — matches Savor's Times component layout ──────────────────────
const TimesBar = ({ times }) => {
  const entries = [
    { label: "PREP",   value: formatTime(times?.prep) },
    { label: "COOK",   value: formatTime(times?.cook) },
    { label: "TOTAL",  value: formatTime(times?.total) },
  ];
  const hasAny = entries.some((e) => e.value);
  if (!hasAny) return null;

  return (
    <View style={timeStyles.row}>
      {entries.map((e, i) => (
        <View
          key={e.label}
          style={[
            timeStyles.cell,
            i === 1 && timeStyles.middleCell,
          ]}
        >
          <Text style={timeStyles.label}>{e.label}</Text>
          <Text style={timeStyles.value}>{e.value ?? "—"}</Text>
        </View>
      ))}
    </View>
  );
};

const timeStyles = StyleSheet.create({
  row: {
    flexDirection: "row",
    width: "100%",
    paddingVertical: 14,
  },
  cell: {
    flex: 1,
    alignItems: "center",
    gap: 5,
  },
  middleCell: {
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: colors.primary + "30",
  },
  label: {
    fontFamily:    "Raleway",
    fontSize:      10,
    letterSpacing: 1.2,
    color:         colors.primary,
    textTransform: "uppercase",
  },
  value: {
    fontFamily: "RalewayBold",
    fontSize:   15,
    color:      colors.textDark,
  },
});

// ── Tab bar ──────────────────────────────────────────────────────────────────
const TabBar = ({ active, onChange }) => (
  <View style={tabStyles.wrap}>
    {["Recipe", "Shop"].map((tab) => (
      <TouchableOpacity
        key={tab}
        style={tabStyles.tab}
        onPress={() => onChange(tab)}
        activeOpacity={0.7}
      >
        <Text style={[tabStyles.label, active === tab && tabStyles.labelActive]}>
          {tab}
        </Text>
        {active === tab && (
          <LinearGradient
            colors={[colors.gradientStart, colors.gradientEnd]}
            style={tabStyles.indicator}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
          />
        )}
      </TouchableOpacity>
    ))}
  </View>
);

const tabStyles = StyleSheet.create({
  wrap: {
    flexDirection:   "row",
    borderBottomWidth: 1,
    borderBottomColor: "#f0ebe6",
    marginHorizontal: 20,
    marginBottom: 4,
  },
  tab: {
    flex:           1,
    alignItems:     "center",
    paddingVertical: 12,
    position:       "relative",
  },
  label: {
    fontFamily: "RalewaySemiBold",
    fontSize:   15,
    color:      "#bbb",
  },
  labelActive: {
    color: colors.textDark,
  },
  indicator: {
    position: "absolute",
    bottom:   -1,
    left:     "20%",
    right:    "20%",
    height:   3,
    borderRadius: 2,
  },
});

// ── Main screen ──────────────────────────────────────────────────────────────
export default function RecipeScreen({ navigation, route }) {
  const { recipe, spinCount, seenIds, isLast } = route.params;
  const [activeTab, setActiveTab] = useState("Recipe");
  const insets = useSafeAreaInsets();

  const tags = [recipe.cuisine, recipe.category].filter(Boolean);

  return (
    <View style={styles.root}>

      {/* ── Gradient header ── */}
      <LinearGradient
        colors={[colors.gradientStart, colors.gradientEnd]}
        style={styles.headerBand}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
      >
        <SafeAreaView edges={["top"]} style={styles.headerInner}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backBtn}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <Text style={styles.backArrow}>‹</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle} numberOfLines={1}>{recipe.name}</Text>
          <View style={styles.headerRight} />
        </SafeAreaView>
      </LinearGradient>

      {/* ── Scrollable body ── */}
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: 120 + insets.bottom }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero image */}
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

        {/* Tags + title + meta */}
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

          <Text style={styles.recipeName}>{recipe.name}</Text>

          {recipe.description ? (
            <Text style={styles.description}>{recipe.description}</Text>
          ) : null}

          {recipe.user?.username ? (
            <Text style={styles.author}>Shared by {recipe.user.username}</Text>
          ) : null}
        </View>

        {/* Times card */}
        <TonightCard style={styles.timesCard}>
          <TimesBar times={recipe.times} />
        </TonightCard>

        {/* Tab bar */}
        <TabBar active={activeTab} onChange={setActiveTab} />

        {/* Tab content */}
        {activeTab === "Recipe" ? (
          <View style={styles.tabContent}>
            <Text style={styles.sectionLabel}>Instructions</Text>
            {(recipe.instructions || []).map((step, i) => (
              <TonightCard key={i} style={styles.stepCard}>
                <View style={styles.stepRow}>
                  <LinearGradient
                    colors={[colors.gradientStart, colors.gradientEnd]}
                    style={styles.stepBadge}
                    start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                  >
                    <Text style={styles.stepNumber}>{i + 1}</Text>
                  </LinearGradient>
                  <Text style={styles.stepText}>{step}</Text>
                </View>
              </TonightCard>
            ))}
          </View>
        ) : (
          <View style={styles.tabContent}>
            <Text style={styles.sectionLabel}>Ingredients</Text>
            {recipe.recipeYield ? (
              <Text style={styles.yieldText}>Serves {recipe.recipeYield}</Text>
            ) : null}
            <TonightCard>
              {(recipe.ingredients || []).map((item, i) => (
                <View
                  key={i}
                  style={[
                    styles.ingredientRow,
                    i < recipe.ingredients.length - 1 && styles.ingredientRowBorder,
                  ]}
                >
                  <View style={styles.ingredientDot} />
                  <Text style={styles.ingredientText}>{item}</Text>
                </View>
              ))}
            </TonightCard>
          </View>
        )}
      </ScrollView>

      {/* ── Sticky bottom CTA ── */}
      <View style={[styles.stickyBottom, { paddingBottom: 16 + insets.bottom }]}>
        <TonightButton
          icon="✅"
          title="Cooked it!"
          subtitle="Mark as done and give feedback"
          onPress={() => navigation.navigate("Done", { recipe })}
        />
        {!isLast && (
          <TouchableOpacity
            style={styles.spinAgainBtn}
            onPress={() => navigation.goBack()}
            activeOpacity={0.7}
          >
            <Text style={styles.spinAgainLabel}>
              ← Spin again ({3 - spinCount} left)
            </Text>
          </TouchableOpacity>
        )}
      </View>

    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.offWhite },

  // Header
  headerBand:  { paddingBottom: 14 },
  headerInner: {
    flexDirection:  "row",
    alignItems:     "center",
    paddingTop:     4,
    paddingHorizontal: 16,
  },
  backBtn:   { width: 32 },
  backArrow: { fontSize: 28, color: "#fff", lineHeight: 32 },
  headerTitle: {
    flex:       1,
    fontFamily: "RalewayBold",
    fontSize:   17,
    color:      "#fff",
    textAlign:  "center",
    paddingHorizontal: 8,
  },
  headerRight: { width: 32 },

  // Scroll
  scroll:        { flex: 1 },
  scrollContent: { gap: 16, paddingBottom: 24 },

  // Image
  imageWrap: {
    width:  SCREEN_WIDTH,
    height: 240,
  },
  image: { width: "100%", height: "100%" },
  imagePlaceholder: {
    backgroundColor: colors.primary + "18",
    alignItems:      "center",
    justifyContent:  "center",
  },
  imagePlaceholderIcon: { fontSize: 52 },

  // Meta
  metaSection: {
    paddingHorizontal: 20,
    gap: 8,
  },
  tags: {
    flexDirection: "row",
    flexWrap:      "wrap",
    gap:           8,
  },
  tag: {
    backgroundColor: colors.primary,
    borderRadius:    20,
    paddingVertical:   4,
    paddingHorizontal: 12,
  },
  tagText: {
    fontFamily:    "RalewayBold",
    fontSize:      11,
    color:         "#fff",
    letterSpacing: 0.5,
  },
  recipeName: {
    fontFamily: "RalewayBold",
    fontSize:   26,
    color:      colors.textDark,
    lineHeight: 32,
  },
  description: {
    fontFamily: "Raleway",
    fontSize:   14,
    color:      "#888",
    lineHeight: 22,
  },
  author: {
    fontFamily:    "RalewayBold",
    fontSize:      12,
    color:         "#bbb",
    letterSpacing: 0.3,
  },

  // Times
  timesCard: { marginHorizontal: 20 },

  // Tab content
  tabContent: {
    paddingHorizontal: 20,
    gap: 10,
  },
  sectionLabel: {
    fontFamily:    "RalewayBold",
    fontSize:      13,
    color:         colors.textLight,
    letterSpacing: 1,
    textTransform: "uppercase",
    marginBottom:  2,
  },
  yieldText: {
    fontFamily: "Raleway",
    fontSize:   13,
    color:      colors.textMid,
    marginBottom: 2,
  },

  // Step cards
  stepCard: { padding: 14 },
  stepRow: {
    flexDirection: "row",
    gap:           14,
    alignItems:    "flex-start",
  },
  stepBadge: {
    width:          30,
    height:         30,
    borderRadius:   10,
    alignItems:     "center",
    justifyContent: "center",
    flexShrink:     0,
    marginTop:      2,
  },
  stepNumber: {
    fontFamily: "RalewayBold",
    fontSize:   13,
    color:      "#fff",
  },
  stepText: {
    flex:       1,
    fontFamily: "Raleway",
    fontSize:   15,
    color:      colors.textDark,
    lineHeight: 23,
  },

  // Ingredient rows
  ingredientRow: {
    flexDirection:  "row",
    alignItems:     "flex-start",
    gap:            12,
    paddingVertical: 10,
  },
  ingredientRowBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#f0ebe6",
  },
  ingredientDot: {
    width:           7,
    height:          7,
    borderRadius:    4,
    backgroundColor: colors.primary,
    marginTop:       6,
    flexShrink:      0,
  },
  ingredientText: {
    flex:       1,
    fontFamily: "Raleway",
    fontSize:   15,
    color:      colors.textDark,
    lineHeight: 22,
  },

  // Sticky bottom
  stickyBottom: {
    position:          "absolute",
    bottom:            0,
    left:              0,
    right:             0,
    backgroundColor:   "#fff",
    paddingHorizontal: 20,
    paddingTop:        12,
    borderTopWidth:    1,
    borderTopColor:    "#f0ebe6",
    gap:               8,
    elevation:         8,
    shadowColor:       "#000",
    shadowOffset:      { width: 0, height: -3 },
    shadowOpacity:     0.06,
    shadowRadius:      8,
  },
  spinAgainBtn: { alignItems: "center", paddingVertical: 4 },
  spinAgainLabel: {
    fontFamily: "Raleway",
    fontSize:   14,
    color:      colors.textMid,
  },
});
import React, { useState } from "react";
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
import { colors } from "../constants/colors";
import TonightButton from "../components/TonightButton";
import TonightCard from "../components/TonightCard";
import PotluckHeader from "../components/PotluckHeader";
import InlineTimes from "../components/InlineTimes";
import IngredientList from "../components/IngredientList";
import ShopTab from "../components/ShopTab";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

const BRAND = {
  teal:      "#142829",
  tealDark:  "#0d1c1d",
  tealLight: "#1a3536",
  orange:    "#FF9800",
  border:    "#f0ebe6",
};

// ── Tab bar ───────────────────────────────────────────────────────────────────

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
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          />
        )}
      </TouchableOpacity>
    ))}
  </View>
);

const tabStyles = StyleSheet.create({
  wrap: {
    flexDirection:     "row",
    borderBottomWidth: 1,
    borderBottomColor: BRAND.border,
    marginHorizontal:  20,
    marginBottom:      4,
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
    color:      BRAND.teal,
    opacity:    0.4,
  },
  labelActive: {
    color:   BRAND.teal,
    opacity: 1,
  },
  indicator: {
    position:     "absolute",
    bottom:       -1,
    left:         "20%",
    right:        "20%",
    height:       3,
    borderRadius: 2,
  },
});

// ── Main screen ───────────────────────────────────────────────────────────────

export default function RecipeScreen({ navigation, route }) {
  const { recipe, spinCount, seenIds } = route.params;
  const [activeTab, setActiveTab] = useState("Recipe");
  const insets = useSafeAreaInsets();

  const tags       = [recipe.cuisine, recipe.category].filter(Boolean);
  const recipeUrl  = `https://getsavor.recipes/r/${recipe.id}`;
  const stickyHeight = 94 + 94 + 30 + 12 + (insets.bottom || 12);

  const handleSaveToSavor = () => {
    const deepLink = `savor://create?url=${encodeURIComponent(recipeUrl)}`;
    Linking.openURL(deepLink).catch(() => {
      Linking.openURL("https://play.google.com/store/apps/details?id=com.calicosquid.savorrecipes");
    });
  };

  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" translucent backgroundColor="transparent" />

      <PotluckHeader onBack={() => navigation.goBack()} spinCount={spinCount} />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: stickyHeight + 24 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Hero image ── */}
        {recipe.image ? (
          <View style={styles.imageWrap}>
            <Image source={{ uri: recipe.image }} style={styles.image} resizeMode="cover" />
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
          <Text style={styles.recipeName}>{recipe.name}</Text>
          {recipe.description ? (
            <Text style={styles.description}>{recipe.description}</Text>
          ) : null}
          <InlineTimes times={recipe.times} />
          {recipe.sourceUrl ? (
            <TouchableOpacity
              onPress={() => Linking.openURL(recipe.sourceUrl).catch(() => {})}
              activeOpacity={0.7}
              hitSlop={{ top: 6, bottom: 6, left: 4, right: 4 }}
              style={styles.sourceRow}
            >
              <Icon source="web" size={11} color={BRAND.teal} />
              <Text style={styles.sourceUrl} numberOfLines={1}>
                {recipe.sourceUrl.replace(/^https?:\/\/(www\.)?/, "").split("/")[0]}
              </Text>
            </TouchableOpacity>
          ) : null}
        </View>

        {/* ── Tabs ── */}
        <TabBar active={activeTab} onChange={setActiveTab} />

        {activeTab === "Recipe" ? (
          <View style={styles.tabContent}>
            <Text style={styles.sectionLabel}>Ingredients</Text>
            <IngredientList ingredients={recipe.ingredients} recipeYield={recipe.recipeYield} />
            <View style={styles.sectionDivider} />
            <Text style={styles.sectionLabel}>Steps</Text>
            {(recipe.instructions || []).length === 0 ? (
              <Text style={styles.emptyState}>No steps available for this recipe.</Text>
            ) : (
              (recipe.instructions || []).map((step, i) => (
                <TonightCard key={i} style={styles.stepCard}>
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
                </TonightCard>
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
      <View style={[styles.stickyBottom, { paddingBottom: insets.bottom || 12 }]}>
        <TonightButton
          icon="check-bold"
          title="Cooked it!"
          subtitle="Mark as done and go eat"
          onPress={() => navigation.navigate("Done", { recipe })}
        />
        <TonightButton
          icon="content-save-outline"
          title="Save to Savor"
          subtitle="Import this recipe into your box"
          gradientColors={[BRAND.tealLight, BRAND.tealDark]}
          shadowColor={BRAND.teal}
          onPress={handleSaveToSavor}
        />
        <TouchableOpacity
          style={styles.spinAgainBtn}
          onPress={() => navigation.goBack()}
          activeOpacity={0.6}
          hitSlop={{ top: 8, bottom: 8, left: 16, right: 16 }}
        >
          <Text style={styles.spinAgainLabel}>← Back to spinning</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root:          { flex: 1, backgroundColor: colors.offWhite },
  scroll:        { flex: 1 },
  scrollContent: { gap: 16 },

  imageWrap:           { width: SCREEN_WIDTH, height: 220 },
  image:               { width: "100%", height: "100%" },
  imagePlaceholder:    { backgroundColor: colors.primary + "15", alignItems: "center", justifyContent: "center" },
  imagePlaceholderIcon: { fontSize: 52 },

  metaSection: { paddingHorizontal: 20, gap: 8 },
  tags:        { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  tag: {
    backgroundColor:  colors.primary,
    borderRadius:     20,
    paddingVertical:  4,
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
    fontSize:   24,
    color:      BRAND.teal,
    lineHeight: 30,
    marginTop:  2,
  },
  description: {
    fontFamily: "Raleway",
    fontSize:   14,
    color:      BRAND.teal,
    opacity:    0.7,
    lineHeight: 22,
  },
  sourceRow: {
    flexDirection: "row",
    alignItems:    "center",
    gap:           5,
    marginTop:     2,
    opacity:       0.45,
  },
  sourceUrl: {
    flex:               1,
    fontFamily:         "Raleway",
    fontSize:           11,
    color:              BRAND.teal,
    letterSpacing:      0.1,
    textDecorationLine: "underline",
  },

  tabContent:     { paddingHorizontal: 20, gap: 10 },
  sectionLabel: {
    fontFamily:    "RalewayBold",
    fontSize:      11,
    color:         BRAND.teal,
    opacity:       0.5,
    letterSpacing: 1.2,
    textTransform: "uppercase",
    marginBottom:  2,
  },
  sectionDivider: { height: 1, backgroundColor: BRAND.border, marginVertical: 6 },
  emptyState: {
    fontFamily: "Raleway",
    fontSize:   14,
    color:      BRAND.teal,
    opacity:    0.5,
    fontStyle:  "italic",
  },

  stepCard:   { padding: 14 },
  stepRow:    { flexDirection: "row", gap: 14, alignItems: "flex-start" },
  stepBadge: {
    width:          30,
    height:         30,
    borderRadius:   10,
    alignItems:     "center",
    justifyContent: "center",
    flexShrink:     0,
    marginTop:      2,
  },
  stepNumber: { fontFamily: "RalewayBold", fontSize: 13, color: "#fff" },
  stepText: {
    flex:       1,
    fontFamily: "Raleway",
    fontSize:   15,
    color:      BRAND.teal,
    lineHeight: 23,
  },

  stickyBottom: {
    position:          "absolute",
    bottom:            0,
    left:              0,
    right:             0,
    backgroundColor:   "#fff",
    paddingHorizontal: 20,
    paddingTop:        12,
    borderTopWidth:    1,
    borderTopColor:    BRAND.border,
    elevation:         10,
    shadowColor:       BRAND.teal,
    shadowOffset:      { width: 0, height: -4 },
    shadowOpacity:     0.08,
    shadowRadius:      10,
  },
  spinAgainBtn: { alignItems: "center", paddingVertical: 8, marginTop: 2 },
  spinAgainLabel: {
    fontFamily:    "RalewaySemiBold",
    fontSize:      13,
    color:         BRAND.teal,
    opacity:       0.55,
    letterSpacing: 0.2,
  },
});
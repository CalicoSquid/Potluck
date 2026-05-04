import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Share,
  Linking,
  Dimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Icon } from "react-native-paper";
import { colors } from "../constants/colors";
import TonightButton from "../components/TonightButton";
import TonightCard from "../components/TonightCard";
import PotluckHeader from "../components/PotluckHeader";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

// ── Brand palette — extracted from Savor logo, used throughout ───────────────
const BRAND = {
  teal: "#142829",
  tealDark: "#0d1c1d",
  tealLight: "#1a3536",
  green: "#4caf50",
  orange: "#FF9800",
  border: "#f0ebe6", // Savor warm border, the only "neutral" we use
};

// ── Inline times ─────────────────────────────────────────────────────────────

const formatTime = (t) => {
  if (!t) return null;
  const parts = [];
  if (t.hours > 0) parts.push(`${t.hours}h`);
  if (t.minutes > 0) parts.push(`${t.minutes}m`);
  return parts.length ? parts.join(" ") : null;
};

const InlineTimes = ({ times }) => {
  const entries = [
    { label: "Prep", value: formatTime(times?.prep) },
    { label: "Cook", value: formatTime(times?.cook) },
    { label: "Total", value: formatTime(times?.total) },
  ].filter((e) => e.value);
  if (!entries.length) return null;
  return (
    <View style={inlineTimeStyles.row}>
      {entries.map((e, i) => (
        <React.Fragment key={e.label}>
          {i > 0 && <View style={inlineTimeStyles.dot} />}
          <Text style={inlineTimeStyles.text}>
            <Text style={inlineTimeStyles.label}>{e.label} </Text>
            {e.value}
          </Text>
        </React.Fragment>
      ))}
    </View>
  );
};

const inlineTimeStyles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 4,
  },
  dot: {
    width: 3,
    height: 3,
    borderRadius: 2,
    backgroundColor: BRAND.orange,
    opacity: 0.6,
  },
  label: {
    fontFamily: "RalewayBold",
    fontSize: 12,
    color: colors.primary,
  },
  text: {
    fontFamily: "Raleway",
    fontSize: 12,
    color: BRAND.teal,
    opacity: 0.75,
  },
});

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
        <Text
          style={[tabStyles.label, active === tab && tabStyles.labelActive]}
        >
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
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: BRAND.border,
    marginHorizontal: 20,
    marginBottom: 4,
  },
  tab: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 12,
    position: "relative",
  },
  label: {
    fontFamily: "RalewaySemiBold",
    fontSize: 15,
    color: BRAND.teal,
    opacity: 0.4, // inactive — quiet but on-brand
  },
  labelActive: {
    color: BRAND.teal,
    opacity: 1,
  },
  indicator: {
    position: "absolute",
    bottom: -1,
    left: "20%",
    right: "20%",
    height: 3,
    borderRadius: 2,
  },
});

// ── Ingredient list (Recipe tab) ──────────────────────────────────────────────

const IngredientList = ({ ingredients, recipeYield }) => (
  <View>
    {recipeYield ? (
      <Text style={styles.yieldText}>Serves {recipeYield}</Text>
    ) : null}
    <TonightCard>
      {(ingredients || []).map((item, i) => (
        <View
          key={i}
          style={[
            styles.ingredientRow,
            i < ingredients.length - 1 && styles.ingredientRowBorder,
          ]}
        >
          <View style={styles.ingredientDot} />
          <Text style={styles.ingredientText}>{item}</Text>
        </View>
      ))}
    </TonightCard>
  </View>
);

// ── Shop tab — checkable list + share ────────────────────────────────────────

const UNITS = new Set([
  "cup",
  "cups",
  "c",
  "tbsp",
  "tablespoon",
  "tablespoons",
  "tsp",
  "teaspoon",
  "teaspoons",
  "oz",
  "ounce",
  "ounces",
  "lb",
  "lbs",
  "pound",
  "pounds",
  "g",
  "gram",
  "grams",
  "kg",
  "ml",
  "l",
  "litre",
  "litres",
  "liter",
  "liters",
  "pint",
  "pints",
  "quart",
  "quarts",
  "gallon",
  "gallons",
  "fl",
  "clove",
  "cloves",
  "slice",
  "slices",
  "piece",
  "pieces",
  "sprig",
  "sprigs",
  "bunch",
  "handful",
  "pinch",
  "dash",
  "drop",
  "can",
  "cans",
  "jar",
  "jars",
  "package",
  "pkg",
  "bag",
  "stick",
  "head",
  "stalk",
  "stalks",
  "sheet",
]);

const SKIP = new Set([
  "water",
  "salt",
  "pepper",
  "black pepper",
  "white pepper",
  "oil",
  "olive oil",
  "vegetable oil",
  "cooking oil",
  "cooking spray",
  "spray",
  "ice",
  "ice cubes",
  "to taste",
  "as needed",
  "as required",
]);

const parseIngredientName = (str) => {
  let s = str.replace(/\(.*?\)/g, "").trim();
  s = s.split(/[,;]/)[0].trim();
  s = s.replace(/^[\d\s\/½⅓⅔¼¾⅕⅖⅗⅘⅙⅚⅛⅜⅝⅞]+/, "").trim();
  const words = s.split(/\s+/);
  if (
    words.length > 1 &&
    UNITS.has(words[0].toLowerCase().replace(/\.$/, ""))
  ) {
    s = words.slice(1).join(" ");
  }
  s = s.replace(
    /^(large|medium|small|extra large|extra-large|big|tiny|fresh|dried|frozen|whole|ground|chopped|minced|sliced|diced|grated|shredded)\s+/i,
    "",
  );
  return s.trim();
};

const shouldSkip = (str) => {
  const name = parseIngredientName(str).toLowerCase();
  return SKIP.has(name) || name.length === 0;
};

const ShopTab = ({ ingredients, recipeName, recipeId, recipeYield }) => {
  const shopItems = React.useMemo(
    () =>
      (ingredients || [])
        .map((raw, originalIndex) => ({
          raw,
          name: parseIngredientName(raw),
          originalIndex,
        }))
        .filter(({ raw }) => !shouldSkip(raw)),
    [ingredients],
  );

  const [checked, setChecked] = useState({});

  const toggle = (i) => setChecked((prev) => ({ ...prev, [i]: !prev[i] }));

  const handleShare = () => {
    const lines = shopItems.map(({ name }) => `• ${name}`).join("\n");
    const header = recipeYield
      ? `Shopping list for ${recipeName} (serves ${recipeYield}):`
      : `Shopping list for ${recipeName}:`;
    Share.share({ message: `${header}\n\n${lines}` });
  };

  const checkedCount = Object.values(checked).filter(Boolean).length;
  const total = shopItems.length;

  return (
    <View style={styles.tabContent}>
      <View style={shopStyles.headerRow}>
        <View>
          <Text style={styles.sectionLabel}>Shopping list</Text>
          {recipeYield ? (
            <Text style={styles.yieldText}>Serves {recipeYield}</Text>
          ) : null}
        </View>
        <TouchableOpacity
          style={shopStyles.shareBtn}
          onPress={handleShare}
          activeOpacity={0.7}
        >
          <Icon source="share-variant" size={16} color={colors.primary} />
          <Text style={shopStyles.shareLabel}>Share list</Text>
        </TouchableOpacity>
      </View>

      {checkedCount > 0 && (
        <Text style={shopStyles.progress}>
          {checkedCount} of {total} grabbed
        </Text>
      )}

      <TonightCard style={shopStyles.listCard}>
        {shopItems.map(({ name }, i) => (
          <TouchableOpacity
            key={i}
            style={[
              shopStyles.row,
              i < shopItems.length - 1 && shopStyles.rowBorder,
            ]}
            onPress={() => toggle(i)}
            activeOpacity={0.7}
          >
            <View
              style={[
                shopStyles.checkbox,
                checked[i] && shopStyles.checkboxDone,
              ]}
            >
              {checked[i] && <Icon source="check" size={14} color="#fff" />}
            </View>
            <Text
              style={[shopStyles.itemText, checked[i] && shopStyles.itemDone]}
            >
              {name}
            </Text>
          </TouchableOpacity>
        ))}
      </TonightCard>

      {checkedCount === total && total > 0 && (
        <Text style={shopStyles.allDone}>All grabbed — time to cook!</Text>
      )}
    </View>
  );
};

const shopStyles = StyleSheet.create({
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  shareBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingVertical: 2,
    paddingHorizontal: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.primary + "40",
    backgroundColor: colors.primary + "0D",
  },
  shareLabel: {
    fontFamily: "RalewayBold",
    fontSize: 12,
    color: colors.primary,
  },
  progress: {
    fontFamily: "Raleway",
    fontSize: 12,
    color: BRAND.teal,
    opacity: 0.55,
    marginTop: -4,
  },
  listCard: { padding: 0 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingVertical: 13,
    paddingHorizontal: 16,
  },
  rowBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: BRAND.border,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: BRAND.border,
    flexShrink: 0,
    alignItems: "center",
    justifyContent: "center",
  },
  checkboxDone: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  itemText: {
    flex: 1,
    fontFamily: "Raleway",
    fontSize: 15,
    color: BRAND.teal,
    lineHeight: 22,
  },
  itemDone: {
    color: BRAND.teal,
    opacity: 0.4,
    textDecorationLine: "line-through",
  },
  allDone: {
    fontFamily: "RalewayBold",
    fontSize: 13,
    color: colors.primary,
    textAlign: "center",
    marginTop: 4,
  },
});

// ── Main screen ───────────────────────────────────────────────────────────────

export default function RecipeScreen({ navigation, route }) {
  const { recipe, spinCount, seenIds } = route.params;
  const [activeTab, setActiveTab] = useState("Recipe");
  const insets = useSafeAreaInsets();

  const tags = [recipe.cuisine, recipe.category].filter(Boolean);
  console.log("RecipeScreen", { recipe });

  const recipeUrl = `https://getsavor.recipes/r/${recipe.id}`;

  const handleSaveToSavor = () => {
    // Deep links into Savor's Create screen with the recipe URL pre-filled.
    // savor://create?url=... is handled by Savor's linking config in App.js,
    // which decodes the param and passes it to the Create screen as route.params.url.
    // Falls back to Play Store if Savor isn't installed.
    const deepLink = `savor://create?url=${encodeURIComponent(recipeUrl)}`;
    Linking.openURL(deepLink).catch(() => {
      Linking.openURL(
        "https://play.google.com/store/apps/details?id=com.calicosquid.savorrecipes",
      );
    });
  };

  // Sticky bottom: TonightButton x2 (each ~94px outer with marginVertical 8),
  // tertiary link ~30px, top padding 12, top border 1, plus the safe-area inset.
  const stickyHeight = 94 + 94 + 30 + 12 + (insets.bottom || 12);

  return (
    <View style={styles.root}>
      {/* ── Header ── */}
      <PotluckHeader onBack={() => navigation.goBack()} spinCount={spinCount} />

      {/* ── Scroll body ── */}
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: stickyHeight + 24 },
        ]}
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

        {/* Meta */}
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
                {
                  recipe.sourceUrl
                    .replace(/^https?:\/\/(www\.)?/, "")
                    .split("/")[0]
                }
              </Text>
            </TouchableOpacity>
          ) : null}
        </View>

        {/* Tabs */}
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
          <ShopTab
            ingredients={recipe.ingredients}
            recipeName={recipe.name}
            recipeId={recipe.id}
            recipeYield={recipe.recipeYield}
          />
        )}
      </ScrollView>

      {/* ── Sticky bottom ── */}
      <View
        style={[styles.stickyBottom, { paddingBottom: insets.bottom || 12 }]}
      >
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

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.offWhite },

  scroll: { flex: 1 },
  scrollContent: { gap: 16 },

  // ── Hero image ──────────────────────────────────────────────────────────
  imageWrap: { width: SCREEN_WIDTH, height: 220 },
  image: { width: "100%", height: "100%" },
  imagePlaceholder: {
    backgroundColor: colors.primary + "15",
    alignItems: "center",
    justifyContent: "center",
  },
  imagePlaceholderIcon: { fontSize: 52 },

  // ── Recipe meta block ───────────────────────────────────────────────────
  metaSection: {
    paddingHorizontal: 20,
    gap: 8,
  },
  tags: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
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
    color: BRAND.teal,
    lineHeight: 30,
    marginTop: 2,
  },
  description: {
    fontFamily: "Raleway",
    fontSize: 14,
    color: BRAND.teal,
    opacity: 0.7,
    lineHeight: 22,
  },
  author: {
    fontFamily: "RalewayBold",
    fontSize: 12,
    color: BRAND.teal,
    opacity: 0.5,
    letterSpacing: 0.3,
    marginTop: 4,
  },

  // ── Tabbed content ──────────────────────────────────────────────────────
  tabContent: {
    paddingHorizontal: 20,
    gap: 10,
  },
  sectionLabel: {
    fontFamily: "RalewayBold",
    fontSize: 11,
    color: BRAND.teal,
    opacity: 0.5,
    letterSpacing: 1.2,
    textTransform: "uppercase",
    marginBottom: 2,
  },
  sectionDivider: {
    height: 1,
    backgroundColor: BRAND.border,
    marginVertical: 6,
  },
  yieldText: {
    fontFamily: "Raleway",
    fontSize: 13,
    color: BRAND.teal,
    opacity: 0.65,
    marginBottom: 4,
  },
  emptyState: {
    fontFamily: "Raleway",
    fontSize: 14,
    color: BRAND.teal,
    opacity: 0.5,
    fontStyle: "italic",
  },

  // ── Ingredients list ────────────────────────────────────────────────────
  ingredientRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    paddingVertical: 10,
  },
  ingredientRowBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: BRAND.border,
  },
  ingredientDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: colors.primary,
    marginTop: 6,
    flexShrink: 0,
  },
  ingredientText: {
    flex: 1,
    fontFamily: "Raleway",
    fontSize: 15,
    color: BRAND.teal,
    lineHeight: 22,
  },

  // ── Step cards ──────────────────────────────────────────────────────────
  stepCard: { padding: 14 },
  stepRow: {
    flexDirection: "row",
    gap: 14,
    alignItems: "flex-start",
  },
  stepBadge: {
    width: 30,
    height: 30,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    marginTop: 2,
  },
  stepNumber: {
    fontFamily: "RalewayBold",
    fontSize: 13,
    color: "#fff",
  },
  stepText: {
    flex: 1,
    fontFamily: "Raleway",
    fontSize: 15,
    color: BRAND.teal,
    lineHeight: 23,
  },

  // ── Sticky bottom ───────────────────────────────────────────────────────
  stickyBottom: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#fff",
    paddingHorizontal: 20,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: BRAND.border,
    elevation: 10,
    shadowColor: BRAND.teal,
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
  },
  spinAgainBtn: {
    alignItems: "center",
    paddingVertical: 8,
    marginTop: 2,
  },
  spinAgainLabel: {
    fontFamily: "RalewaySemiBold",
    fontSize: 13,
    color: BRAND.teal,
    opacity: 0.55,
    letterSpacing: 0.2,
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
    color: BRAND.teal,
    letterSpacing: 0.1,
    textDecorationLine: "underline",
  },
});

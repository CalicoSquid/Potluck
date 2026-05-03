import React from "react";
import {
  View,
  Text,
  Image,
  StyleSheet,
  ScrollView,
  Linking,
  Dimensions,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Icon } from "react-native-paper";
import { colors } from "../constants/colors";
import TonightButton from "../components/TonightButton";
import TonightCard from "../components/TonightCard";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

const WORDMARK_WIDTH  = SCREEN_WIDTH - 48;
const WORDMARK_ASPECT = 500 / 157;
const WORDMARK_HEIGHT = WORDMARK_WIDTH / WORDMARK_ASPECT;

// Deep link to Savor on Play Store — swap in App Store URL for iOS
const SAVOR_STORE_URL = "https://play.google.com/store/apps/details?id=com.calicosquid.savorrecipes";

// MCI icon names — no emojis
const PERKS = [
  { icon: "package-variant-closed", title: "Your own recipe box",    sub: "Save and organise as many recipes as you want" },
  { icon: "account-group",          title: "Community feed",          sub: "Thousands of recipes shared by real cooks" },
  { icon: "link-variant",           title: "Import from any website", sub: "Paste a URL, we pull the recipe automatically" },
  { icon: "camera",                 title: "Scan from a cookbook",    sub: "Photograph a page and we read it for you" },
];

export default function DoneScreen({ navigation, route }) {
  const recipe = route.params?.recipe;
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.root}>

      {/* ── Gradient header band — decorative only ── */}
      <LinearGradient
        colors={[colors.gradientStart, colors.gradientEnd]}
        style={styles.headerBand}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
      >
        <SafeAreaView edges={["top"]} />
      </LinearGradient>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: 32 + insets.bottom }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Wordmark */}
        <Image
          source={require("../../assets/wordmark-potluck.png")}
          style={[styles.wordmark, { width: WORDMARK_WIDTH, height: WORDMARK_HEIGHT }]}
          resizeMode="contain"
        />

        {/* Hero */}
        <TonightCard style={styles.heroCard}>
          <View style={styles.heroIconWrap}>
            <LinearGradient
              colors={[colors.gradientStart, colors.gradientEnd]}
              style={styles.heroIconBadge}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
            >
              <Icon source="chef-hat" size={32} color="#fff" />
            </LinearGradient>
          </View>
          <Text style={styles.heroTitle}>
            {recipe ? `Nice. ${recipe.name}.` : "Nice work."}
          </Text>
          <Text style={styles.heroSub}>
            That's what cooking looks like. No 45-minute scroll. No decision paralysis.
            Just a recipe and a kitchen.
          </Text>
        </TonightCard>

        {/* Upsell bridge */}
        <View style={styles.bridgeSection}>
          <Text style={styles.bridgeLabel}>Want to do this properly?</Text>
          <Text style={styles.bridgeText}>
            Potluck is the taster. Savor is the full thing — your recipe box, the whole community, imports from anywhere.
            Also free.
          </Text>
        </View>

        {/* Perks */}
        <TonightCard title="What you get in Savor">
          {PERKS.map((p, i) => (
            <View
              key={p.title}
              style={[
                styles.perkRow,
                i < PERKS.length - 1 && styles.perkRowBorder,
              ]}
            >
              <View style={styles.perkIconWrap}>
                <Icon source={p.icon} size={22} color={colors.primary} />
              </View>
              <View style={styles.perkText}>
                <Text style={styles.perkTitle}>{p.title}</Text>
                <Text style={styles.perkSub}>{p.sub}</Text>
              </View>
            </View>
          ))}
        </TonightCard>

        {/* CTAs */}
        <TonightButton
          icon="food-apple"
          title="Get Savor — it's free"
          subtitle="No subscription needed to get started"
          onPress={() => Linking.openURL(SAVOR_STORE_URL)}
        />

        <TonightButton
          icon="dice-multiple"
          title="Spin again"
          subtitle="Back to Potluck for another recipe"
          gradientColors={["#555", "#333"]}
          shadowColor="#333"
          onPress={() => navigation.popToTop()}
        />

        <Text style={styles.footer}>
          Made with Savor · getsavor.recipes
        </Text>

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.offWhite },

  headerBand: { paddingBottom: 12 },

  scroll:        { flex: 1 },
  scrollContent: {
    alignItems:        "center",
    paddingHorizontal: 20,
    paddingTop:        20,
    gap:               16,
  },

  // Wordmark
  wordmark: {
    marginBottom: 4,
  },

  // Hero card
  heroCard: {
    alignItems: "center",
    gap:        12,
    width:      "100%",
  },
  heroIconWrap: {
    marginBottom: 4,
  },
  heroIconBadge: {
    width:          64,
    height:         64,
    borderRadius:   20,
    alignItems:     "center",
    justifyContent: "center",
  },
  heroTitle: {
    fontFamily: "RalewayBold",
    fontSize:   24,
    color:      colors.textDark,
    textAlign:  "center",
    lineHeight: 30,
  },
  heroSub: {
    fontFamily: "Raleway",
    fontSize:   14,
    color:      colors.textMid,
    textAlign:  "center",
    lineHeight: 22,
  },

  // Bridge
  bridgeSection: { gap: 6, paddingHorizontal: 4, width: "100%" },
  bridgeLabel: {
    fontFamily: "RalewayBold",
    fontSize:   17,
    color:      colors.textDark,
  },
  bridgeText: {
    fontFamily: "Raleway",
    fontSize:   14,
    color:      colors.textMid,
    lineHeight: 22,
  },

  // Perks
  perkRow: {
    flexDirection:   "row",
    alignItems:      "flex-start",
    gap:             14,
    paddingVertical: 12,
    width:           "100%",
  },
  perkRowBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#f0ebe6",
  },
  perkIconWrap: {
    width:           36,
    height:          36,
    borderRadius:    10,
    backgroundColor: colors.primary + "15",
    alignItems:      "center",
    justifyContent:  "center",
    flexShrink:      0,
    marginTop:       1,
  },
  perkText:  { flex: 1, gap: 2 },
  perkTitle: {
    fontFamily: "RalewayBold",
    fontSize:   15,
    color:      colors.textDark,
  },
  perkSub: {
    fontFamily: "Raleway",
    fontSize:   13,
    color:      colors.textMid,
    lineHeight: 19,
  },

  footer: {
    fontFamily:    "Raleway",
    fontSize:      12,
    color:         colors.textLight,
    textAlign:     "center",
    letterSpacing: 0.3,
    marginTop:     4,
  },
});